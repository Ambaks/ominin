# Graph Report - .  (2026-07-04)

## Corpus Check
- 42 files · ~14,768 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 159 nodes · 190 edges · 18 communities (10 shown, 8 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.85)
- Token cost: 184,566 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Graphify Skill References|Graphify Skill References]]
- [[_COMMUNITY_Menu Data & Components|Menu Data & Components]]
- [[_COMMUNITY_Package Dependencies|Package Dependencies]]
- [[_COMMUNITY_Commit Workflow|Commit Workflow]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Menu Data & Components 2|Menu Data & Components 2]]
- [[_COMMUNITY_FastAPI Backend|FastAPI Backend]]
- [[_COMMUNITY_Root Layout & Fonts|Root Layout & Fonts]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_Template Icon Asset|Template Icon Asset]]
- [[_COMMUNITY_Template Icon Asset 2|Template Icon Asset 2]]
- [[_COMMUNITY_Template Icon Asset 3|Template Icon Asset 3]]
- [[_COMMUNITY_Template Icon Asset 4|Template Icon Asset 4]]
- [[_COMMUNITY_Template Icon Asset 5|Template Icon Asset 5]]
- [[_COMMUNITY_Backend Package|Backend Package]]

## God Nodes (most connected - your core abstractions)
1. `/graphify Skill` - 21 edges
2. `compilerOptions` - 16 edges
3. `Incremental Update (--update)` - 10 edges
4. `/commit Skill` - 6 edges
5. `Post-commit Auto-rebuild Hook` - 6 edges
6. `Next.js Frontend` - 6 edges
7. `scripts` - 5 edges
8. `AST Structural Extraction` - 5 edges
9. `Query/Path/Explain Flow` - 5 edges
10. `Whisper Video/Audio Transcription` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Graph-first Codebase Queries` --semantically_similar_to--> `Fast Path Query on Existing Graph`  [INFERRED] [semantically similar]
  CLAUDE.md → .claude/skills/graphify/SKILL.md
- `Push Workflow Rules` --semantically_similar_to--> `Post-commit Auto-rebuild Hook`  [INFERRED] [semantically similar]
  CLAUDE.md → .claude/skills/graphify/references/hooks.md
- `Native CLAUDE.md Integration` --semantically_similar_to--> `Graph-first Codebase Queries`  [INFERRED] [semantically similar]
  .claude/skills/graphify/references/hooks.md → CLAUDE.md
- `graphifyy CLI` --references--> `/graphify Skill`  [EXTRACTED]
  README.md → .claude/skills/graphify/SKILL.md
- `Next.js Agent Rules` --conceptually_related_to--> `Next.js Frontend`  [INFERRED]
  frontend/AGENTS.md → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Build Pipeline** — _claude_skills_graphify_skill_ast_extraction, _claude_skills_graphify_skill_semantic_extraction, _claude_skills_graphify_skill_extraction_cache, _claude_skills_graphify_skill_community_detection, _claude_skills_graphify_skill_god_nodes, _claude_skills_graphify_skill_graph_health_check, _claude_skills_graphify_skill_cost_tracker [EXTRACTED 1.00]
- **Ominin Free-tier Tech Stack** — claude_frontend_stack, claude_backend_stack, claude_supabase, claude_claude_api_integration [EXTRACTED 1.00]
- **Keeping the Knowledge Graph Current** — _claude_skills_graphify_references_update_incremental_update, _claude_skills_graphify_references_hooks_post_commit_hook, _claude_skills_graphify_references_add_watch_watch_mode, claude_workflow_rules, _claude_skills_commit_skill_project_upkeep [INFERRED 0.85]

## Communities (18 total, 8 thin omitted)

### Community 0 - "Graphify Skill References"
Cohesion: 0.09
Nodes (35): URL Ingestion (/graphify add), Watch Mode Auto-rebuild, Neo4j/FalkorDB Cypher Export, MCP Graph Server, Token Reduction Benchmark, Discrete Confidence Score Rubric, Deterministic Node ID Format, Extraction Subagent Prompt (+27 more)

### Community 1 - "Menu Data & Components"
Cohesion: 0.13
Nodes (11): BADGE_LABELS, DishCard(), FeaturedCard(), RowCard(), MenuSection(), Badge, formatPrice(), MenuCategory (+3 more)

### Community 2 - "Package Dependencies"
Cohesion: 0.09
Nodes (21): dependencies, next, react, react-dom, devDependencies, eslint, eslint-config-next, tailwindcss (+13 more)

### Community 3 - "Commit Workflow"
Cohesion: 0.11
Nodes (21): /commit Skill, Commit Message Standard, Project Upkeep Step, Commit Safety Checks, FastAPI Backend, Business Constraints, Claude API Integration, Project Skill Trigger Registry (+13 more)

### Community 4 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 5 - "Menu Data & Components 2"
Cohesion: 0.23
Nodes (9): generateMetadata(), MenuPage(), CategoryLink, CategoryNav(), Hero(), LANGUAGES, MenuFooter(), getRestaurant() (+1 more)

### Community 6 - "FastAPI Backend"
Cohesion: 0.29
Nodes (3): Settings, BaseSettings, eslintConfig

### Community 7 - "Root Layout & Fonts"
Cohesion: 0.33
Nodes (4): fraunces, instrumentSans, metadata, viewport

## Knowledge Gaps
- **68 isolated node(s):** `backend`, `eslintConfig`, `nextConfig`, `name`, `version` (+63 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `/graphify Skill` connect `Graphify Skill References` to `Commit Workflow`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `graphifyy CLI` connect `Commit Workflow` to `Graphify Skill References`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `backend`, `eslintConfig`, `nextConfig` to the rest of the system?**
  _69 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Graphify Skill References` be split into smaller, more focused modules?**
  _Cohesion score 0.08907563025210084 - nodes in this community are weakly interconnected._
- **Should `Menu Data & Components` be split into smaller, more focused modules?**
  _Cohesion score 0.12554112554112554 - nodes in this community are weakly interconnected._
- **Should `Package Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `Commit Workflow` be split into smaller, more focused modules?**
  _Cohesion score 0.11428571428571428 - nodes in this community are weakly interconnected._