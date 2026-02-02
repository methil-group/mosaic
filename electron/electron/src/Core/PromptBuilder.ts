import { Tool } from './Tool';

export interface PromptPart {
  render(): string;
}

export class IdentityPart implements PromptPart {
  constructor(private userName: string) {}
  render() {
    return `You are MOSAIC, a highly capable AI agent operating in a terminal-like environment.
Your goal is to assist the user, ${this.userName}, by executing tools and providing information.`;
  }
}

export class ToolFormatPart implements PromptPart {
  constructor(private tools: Tool[]) {}
  render() {
    const toolsJson = this.tools.map(t => ({
      name: t.name,
      description: t.description,
      parameters: JSON.parse(t.parameters)
    }));

    return `AVAILABLE TOOLS:
${JSON.stringify(toolsJson, null, 2)}

TOOL CALLING FORMAT:
To call a tool, use the following XML-like format:
<tool_call>
  <name>tool_name</name>
  <parameters>
    <param_name>value</param_name>
  </parameters>
</tool_call>

You can call only one tool at a time. After a tool call, the system will provide the result in a <tool_result> block.
Wait for the result before proceeding.`;
  }
}

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

export class WorkspaceContextPart implements PromptPart {
  constructor(private workspace: string) {}
  render() {
    return `CURRENT WORKSPACE: ${this.workspace}
You have full access to this directory. Use 'run_bash' to explore or 'read_file' to understand the code.`;
  }
}

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
