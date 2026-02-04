import { Tool } from '../Tools/Tool';
import { PromptPart } from './Part/PromptPart';
import { IdentityPart } from './Part/IdentityPart';
import { ToolFormatPart } from './Part/ToolFormatPart';
import { ChecklistBehaviorPart } from './Part/ChecklistBehaviorPart';
import { WorkspaceContextPart } from './Part/WorkspaceContextPart';
import { PersonaPart } from './Part/PersonaPart';

export class PromptBuilder {
  static createSystemPrompt(tools: Tool[], workspace: string, userName: string, persona?: string): string {
    const parts: PromptPart[] = [
      new IdentityPart(userName),
      new WorkspaceContextPart(workspace),
      new ToolFormatPart(tools),
      new ChecklistBehaviorPart()
    ];

    if (persona) {
      parts.unshift(new PersonaPart(persona));
    }

    return parts.map(p => p.render()).join('\n\n') + `

## CRITICAL RULES

1. **You MUST either call a tool OR provide a final answer. Never say what you're "going to do" - just DO IT.**
2. If you need more information, call the appropriate tool immediately.
3. Only provide a final answer when you have completed the task and gathered all necessary information.
4. Never respond with "Now let me..." or "I will..." - if you need to do something, call the tool.`;
  }

  static formatToolResult(name: string, result: string): string {
    return `<tool_result name="${name}">\n${result}\n</tool_result>`;
  }
}
