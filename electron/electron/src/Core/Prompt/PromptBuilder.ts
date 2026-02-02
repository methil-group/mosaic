import { Tool } from '../Tools/Tool';
import { PromptPart } from './Part/PromptPart';
import { IdentityPart } from './Part/IdentityPart';
import { ToolFormatPart } from './Part/ToolFormatPart';
import { ChecklistBehaviorPart } from './Part/ChecklistBehaviorPart';
import { WorkspaceContextPart } from './Part/WorkspaceContextPart';

export class PromptBuilder {
  static createSystemPrompt(tools: Tool[], workspace: string, userName: string): string {
    const parts: PromptPart[] = [
      new IdentityPart(userName),
      new WorkspaceContextPart(workspace),
      new ToolFormatPart(tools),
      new ChecklistBehaviorPart()
    ];

    return parts.map(p => p.render()).join('\n\n') + '\n\nIf you have a final answer, just provide it as plain text.';
  }

  static formatToolResult(name: string, result: string): string {
    return `<tool_result name="${name}">\n${result}\n</tool_result>`;
  }
}
