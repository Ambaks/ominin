// Après un `git push` de l'agent : exige l'entrée du journal, que /push ait été tapé ou non.
let raw = "";
for await (const chunk of process.stdin) raw += chunk;
const command = JSON.parse(raw).tool_input?.command ?? "";

if (/\bgit\b[^\n;&|]*\bpush\b/.test(command) && !/--dry-run/.test(command) && !/npm run journal/.test(command)) {
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext:
        'A git push just ran. If it succeeded, post the team journal entry now, before anything else: write the summary to a temporary file, then from frontend/ run `npm run journal -- "<titre>" <fichier>` (format in the /push skill). Merges into main are announced by the journal-merge GitHub Action.',
    },
  }));
}
