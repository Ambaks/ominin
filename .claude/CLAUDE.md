# graphify
- **graphify** (`.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

# new-restaurant
- **new-restaurant** (`.claude/skills/new-restaurant/SKILL.md`) - onboard a restaurant client end to end: intake of their flyer/menu/photos, web research, faithful transcription, their QR menu in the restaurant's own identity, audited stock photos, then a loop of fresh scoring agents until it scores 9/10 and an engineering reviewer passes the code. Also updates an existing client. Trigger: `/new-restaurant`
When the user types `/new-restaurant`, or brings a new restaurant client or a flyer/menu to turn into a page, follow the new-restaurant skill's phases before doing anything else.

# ominin-pdf
- **ominin-pdf** (`.claude/skills/ominin-pdf/SKILL.md`) - the "liquid glass" design system and kit for every designed PDF: brochures, leaflets, pitch PDFs, tutorials, guides, reports. Trigger: `/ominin-pdf`
Whenever a designed PDF is asked for, whatever the subject, use this skill rather than improvising a design.

# pull / push
- **pull** (`.claude/skills/pull/SKILL.md`) - start of a work session: pull, refresh the local graphify graph. Trigger: `/pull`
- **push** (`.claude/skills/push/SKILL.md`) - end of a work session: README status, commit, push, team journal entry (admin → Projet → Journal). Trigger: `/push`
