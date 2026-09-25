# graphify
- **graphify** (`.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

# new-restaurant
- **new-restaurant** (`.claude/skills/new-restaurant/SKILL.md`) - onboard a restaurant client end to end: intake of their flyer/menu/photos, web research, faithful transcription, their QR menu in two versions (restaurant identity + Ominin house style), audited stock photos, then a loop of fresh scoring agents until both score 9/10. Also updates an existing client. Trigger: `/new-restaurant`
When the user types `/new-restaurant`, or brings a new restaurant client or a flyer/menu to turn into a page, follow the new-restaurant skill's phases before doing anything else.
