use super::PromptPart;

pub struct CodingWorkflowPart;

impl PromptPart for CodingWorkflowPart {
    fn render(&self) -> String {
        "## CODING WORKFLOW\n\n\
         Follow this sequence for every coding task:\n\n\
         1. **UNDERSTAND** — Read relevant files, search for patterns, list directory structure.\n   \
            Never modify code you haven't read first.\n\
         2. **PLAN** — Use manage_todos to outline your approach before writing any code.\n\
         3. **IMPLEMENT** — Use `edit_file` for modifications (preferred), `write_file` only for new files.\n\
         4. **VERIFY** — Run builds/tests with `run_command` to confirm your changes work.\n\
         5. **REPORT** — Summarize what you did, what changed, and any remaining issues.\n\n\
         NEVER skip step 1. NEVER write code without reading the existing file first.\n\
         ALWAYS verify your changes compile/run before reporting success."
            .to_string()
    }
}
