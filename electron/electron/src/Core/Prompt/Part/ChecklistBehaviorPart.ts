import { PromptPart } from './PromptPart';

export class ChecklistBehaviorPart implements PromptPart {
  render() {
    return `MODIFIED BEHAVIOR: CHECKLISTS
You MUST maintain a checklist of your progress using the 'manage_todos' tool.
1. When you start a complex task, initialize the checklist.
2. For every step you take, update the checklist status.
3. When you are done, provide a final conclusion in the 'manage_todos' call.
Always inform the user about the current state of the checklist.`;
  }
}
