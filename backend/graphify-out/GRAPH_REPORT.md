# Graph Report - backend  (2026-08-19)

## Corpus Check
- 25 files · ~5,006 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 95 nodes · 189 edges · 14 communities (12 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4d9cb583`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_outreach.py|outreach.py]]
- [[_COMMUNITY_get_supabase|get_supabase]]
- [[_COMMUNITY_gmail.py|gmail.py]]
- [[_COMMUNITY_inbox.py|inbox.py]]
- [[_COMMUNITY_enrichment.py|enrichment.py]]
- [[_COMMUNITY_discovery.py|discovery.py]]
- [[_COMMUNITY_agent.py|agent.py]]
- [[_COMMUNITY_config.py|config.py]]
- [[_COMMUNITY_backend|backend]]

## God Nodes (most connected - your core abstractions)
1. `get_supabase()` - 19 edges
2. `parse_structured()` - 10 edges
3. `build_email_body()` - 6 edges
4. `_trigger()` - 6 edges
5. `_enrich_one()` - 6 edges
6. `_compose_one()` - 6 edges
7. `InboxVerdict` - 5 edges
8. `_ingest_one()` - 5 edges
9. `is_suppressed()` - 5 edges
10. `send_approved_batch()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `_qualify()` --calls--> `parse_structured()`  [EXTRACTED]
  app/services/enrichment.py → app/clients/claude.py
- `_classify()` --calls--> `parse_structured()`  [EXTRACTED]
  app/services/inbox.py → app/clients/claude.py
- `run_discovery()` --calls--> `get_supabase()`  [EXTRACTED]
  app/services/discovery.py → app/clients/supabase.py
- `add_suppression()` --calls--> `get_supabase()`  [EXTRACTED]
  app/services/emailing.py → app/clients/supabase.py
- `run_enrichment()` --calls--> `get_supabase()`  [EXTRACTED]
  app/services/enrichment.py → app/clients/supabase.py

## Import Cycles
- 1-file cycle: `app/clients/supabase.py -> app/clients/supabase.py`

## Communities (14 total, 2 thin omitted)

### Community 0 - "outreach.py"
Cohesion: 0.24
Nodes (12): _credentials_env(), _parse(), parse_structured(), The Agent SDK spawns a Claude Code subprocess that authenticates from     the pr, Single-turn, tool-less Claude call returning schema-validated output.      Sync, ColdEmail, _compose_one(), _eligible() (+4 more)

### Community 1 - "get_supabase"
Cohesion: 0.23
Nodes (14): get_supabase(), add_suppression(), daily_cold_count(), is_suppressed(), log_email_activity(), Cold emails already sent today, Paris time (the cap's clock)., Send every approved outbound email of the given kinds, oldest first.      At-mos, send_approved_batch() (+6 more)

### Community 2 - "gmail.py"
Cohesion: 0.19
Nodes (9): extract_body_text(), get_message(), list_inbox(), Send a plain-text email. Returns {id, threadId}., Message stubs ({id, threadId}) for recent inbound mail., Walk MIME parts for text/plain; fall back to stripped text/html., send(), _service() (+1 more)

### Community 3 - "inbox.py"
Cohesion: 0.35
Nodes (8): InboxVerdict, build_email_body(), cnil_footer(), Léa Moreau — the agent's sales persona.  The persona system prompt is shared by, _apply(), _classify(), _process_message(), run_inbox()

### Community 4 - "enrichment.py"
Cohesion: 0.36
Nodes (8): Qualification, _enrich_one(), _fetch_pages(), _fetch_site(), _pick_email(), _qualify(), run_enrichment(), BaseModel

### Community 5 - "discovery.py"
Cohesion: 0.36
Nodes (6): _address_component(), _category(), _ingest(), _ingest_one(), run_discovery(), _slugify()

### Community 6 - "agent.py"
Cohesion: 0.47
Nodes (7): require_trigger_secret(), _trigger(), trigger_discover(), trigger_enrich(), trigger_inbox(), trigger_outreach(), BackgroundTasks

## Knowledge Gaps
- **1 isolated node(s):** `backend`
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `get_supabase()` connect `get_supabase` to `outreach.py`, `inbox.py`, `enrichment.py`, `discovery.py`, `config.py`?**
  _High betweenness centrality (0.174) - this node is a cross-community bridge._
- **Why does `parse_structured()` connect `outreach.py` to `inbox.py`, `enrichment.py`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **What connects `The Agent SDK spawns a Claude Code subprocess that authenticates from     the pr`, `Single-turn, tool-less Claude call returning schema-validated output.      Sync`, `Send a plain-text email. Returns {id, threadId}.` to the rest of the system?**
  _13 weakly-connected nodes found - possible documentation gaps or missing edges._