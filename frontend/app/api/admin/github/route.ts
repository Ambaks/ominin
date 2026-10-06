import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/server";
import type {
  Gate,
  ProjetData,
  ProjetIssue,
  ProjetPull,
} from "@/lib/admin/projet";

/*
 * Section Projet de l'admin : gates (milestones), issues ouvertes et pull
 * requests ouvertes du dépôt, lues en une requête GraphQL. Le jeton reste
 * côté serveur ; GitHub reste la seule source — rien n'est recopié en base.
 */

const GRAPHQL_URL = "https://api.github.com/graphql";
/** Plafond d'une page GraphQL chez GitHub. */
const PAGE_SIZE = 100;

const QUERY = `
query Projet($owner: String!, $name: String!, $first: Int!, $issuesAfter: String) {
  repository(owner: $owner, name: $name) {
    milestones(first: $first, states: [OPEN, CLOSED]) {
      nodes {
        number title description dueOn state closedAt url
        open: issues(states: OPEN) { totalCount }
        closed: issues(states: CLOSED) { totalCount }
      }
    }
    issues(first: $first, after: $issuesAfter, states: OPEN, orderBy: { field: UPDATED_AT, direction: DESC }) {
      pageInfo { hasNextPage endCursor }
      nodes {
        number title url updatedAt
        milestone { number }
        labels(first: 20) { nodes { name } }
        assignees(first: 10) { nodes { login name } }
      }
    }
    pullRequests(first: $first, states: OPEN, orderBy: { field: UPDATED_AT, direction: DESC }) {
      nodes {
        number title url isDraft updatedAt headRefName reviewDecision mergeable
        author { login }
        labels(first: 20) { nodes { name } }
        closingIssuesReferences(first: 10) {
          nodes { number labels(first: 20) { nodes { name } } }
        }
        commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
      }
    }
  }
}`;

interface Named {
  nodes: { name: string }[];
}

interface Response {
  data?: {
    repository: {
      milestones: {
        nodes: {
          number: number;
          title: string;
          description: string | null;
          dueOn: string | null;
          state: "OPEN" | "CLOSED";
          closedAt: string | null;
          url: string;
          open: { totalCount: number };
          closed: { totalCount: number };
        }[];
      };
      issues: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        nodes: {
          number: number;
          title: string;
          url: string;
          updatedAt: string;
          milestone: { number: number } | null;
          labels: Named;
          assignees: { nodes: { login: string; name: string | null }[] };
        }[];
      };
      pullRequests: {
        nodes: {
          number: number;
          title: string;
          url: string;
          isDraft: boolean;
          updatedAt: string;
          headRefName: string;
          reviewDecision: ProjetPull["review"];
          mergeable: "MERGEABLE" | "CONFLICTING" | "UNKNOWN";
          author: { login: string } | null;
          labels: Named;
          closingIssuesReferences: {
            nodes: { number: number; labels: Named }[];
          };
          commits: {
            nodes: {
              commit: {
                statusCheckRollup: { state: ProjetPull["checks"] } | null;
              };
            }[];
          };
        }[];
      };
    };
  };
  errors?: { message: string }[];
}

const names = (labels: Named) => labels.nodes.map((label) => label.name);

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const token = process.env.GITHUB_TOKEN;
  const [owner, name] = (process.env.GITHUB_REPO ?? "").split("/");
  if (!token || !owner || !name) {
    return NextResponse.json(
      {
        error:
          "GITHUB_TOKEN / GITHUB_REPO (« propriétaire/dépôt ») manquants sur Vercel.",
      },
      { status: 500 },
    );
  }

  const request = async (issuesAfter: string | null) => {
    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: QUERY,
        variables: { owner, name, first: PAGE_SIZE, issuesAfter },
      }),
      cache: "no-store",
    }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as Response | null;
    const repository = body?.data?.repository;
    if (!response?.ok || !repository) {
      const reason =
        body?.errors?.[0]?.message ?? `HTTP ${response?.status ?? "réseau"}`;
      throw new Error(`GitHub : ${reason}`);
    }
    return repository;
  };

  try {
    const first = await request(null);
    const issueNodes = [...first.issues.nodes];
    let page = first.issues.pageInfo;
    while (page.hasNextPage) {
      const next = await request(page.endCursor);
      issueNodes.push(...next.issues.nodes);
      page = next.issues.pageInfo;
    }

    const gates: Gate[] = first.milestones.nodes.map((milestone) => ({
      number: milestone.number,
      title: milestone.title,
      description: milestone.description,
      dueOn: milestone.dueOn,
      closed: milestone.state === "CLOSED",
      url: milestone.url,
      openCount: milestone.open.totalCount,
      closedCount: milestone.closed.totalCount,
    }));

    const issues: ProjetIssue[] = issueNodes.map((issue) => ({
      number: issue.number,
      title: issue.title,
      url: issue.url,
      updatedAt: issue.updatedAt,
      gate: issue.milestone?.number ?? null,
      labels: names(issue.labels),
      assignees: issue.assignees.nodes.map((person) => ({
        login: person.login,
        name: person.name,
      })),
    }));

    const pulls: ProjetPull[] = first.pullRequests.nodes.map((pull) => ({
      number: pull.number,
      title: pull.title,
      url: pull.url,
      draft: pull.isDraft,
      updatedAt: pull.updatedAt,
      branch: pull.headRefName,
      author: pull.author?.login ?? null,
      review: pull.reviewDecision,
      conflict: pull.mergeable === "CONFLICTING",
      checks: pull.commits.nodes[0]?.commit.statusCheckRollup?.state ?? null,
      labels: [
        ...new Set([
          ...names(pull.labels),
          ...pull.closingIssuesReferences.nodes.flatMap((issue) =>
            names(issue.labels),
          ),
        ]),
      ],
      closes: pull.closingIssuesReferences.nodes.map((issue) => issue.number),
    }));

    const data: ProjetData = { gates, issues, pulls, repo: `${owner}/${name}` };
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "GitHub injoignable." },
      { status: 502 },
    );
  }
}
