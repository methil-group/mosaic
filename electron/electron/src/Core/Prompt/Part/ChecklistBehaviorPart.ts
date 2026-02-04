import { PromptPart } from './PromptPart';

export class ChecklistBehaviorPart implements PromptPart {
  render() {
    return `MODIFIED BEHAVIOR: CHECKLISTS
You MUST maintain a checklist of your progress using the 'manage_todos' tool.
1. When you start a complex task, initialize the checklist.
2. For every step you take, update the checklist status.
3. Use the following format for each item in the 'checklist' parameter:
   - [ ] for pending tasks
   - [>] for in-progress tasks
   - [x] for completed tasks
   - Follow with 'Task Name <- context/details'
EXAMPLE CALL:
<tool_call>
  <name>manage_todos</name>
  <parameters>
    <checklist>
[x] Initialization <- Done
[>] Researching files <- Currently reading routes
[ ] Final report <- Pending
    </checklist>
</tool_call>
Always inform the user about the current state of the checklist.`;
  }
}
