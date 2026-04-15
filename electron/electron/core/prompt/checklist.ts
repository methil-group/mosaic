import type { PromptPart } from './types'

class ChecklistBehaviorPart implements PromptPart {
    render(): string {
        return `## PROGRESS TRACKING

For complex tasks, maintain a checklist using the \`manage_todos\` tool:
- \`[ ]\` pending  \`[>]\` in-progress  \`[x]\` completed
- Format: \`[status] Task Name <- context\`

Update the checklist as you make progress. The user sees it in real-time.`
    }
}

export default ChecklistBehaviorPart
