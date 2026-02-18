use super::PromptPart;

pub struct ChecklistBehaviorPart;

impl PromptPart for ChecklistBehaviorPart {
    fn render(&self) -> String {
        "## PROGRESS TRACKING\n\n\
         For complex tasks, maintain a checklist using the `manage_todos` tool:\n\
         - `[ ]` pending  `[>]` in-progress  `[x]` completed\n\
         - Format: `[status] Task Name <- context`\n\n\
         Update the checklist as you make progress. The user sees it in real-time."
            .to_string()
    }
}
