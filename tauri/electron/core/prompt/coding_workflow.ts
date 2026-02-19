import type { PromptPart } from './types'

class CodingWorkflowPart implements PromptPart {
    render(): string {
        return `## CODING WORKFLOW

Follow this sequence for every coding task:

1. **UNDERSTAND** — Read relevant files, search for patterns, list directory structure.
   Never modify code you haven't read first.
2. **PLAN** — Use manage_todos to outline your approach before writing any code.
3. **IMPLEMENT** — Use \`edit_file\` for modifications (preferred), \`write_file\` only for new files.
4. **VERIFY** — Run builds/tests with \`run_command\` to confirm your changes work.
5. **REPORT** — Summarize what you did, what changed, and any remaining issues.

NEVER skip step 1. NEVER write code without reading the existing file first.
ALWAYS verify your changes compile/run before reporting success.`
    }
}

export default CodingWorkflowPart
