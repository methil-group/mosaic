import { Tool } from './Tool';

export class PromptBuilder {
  static createSystemPrompt(tools: Tool[], workspace: string, userName: string): string {
    const toolsJson = tools.map(t => ({
      name: t.name,
      description: t.description,
      parameters: JSON.parse(t.parameters)
    }));

    return `You are MOSAIC, a highly capable AI agent operating in a terminal-like environment.
Your goal is to assist the user, ${userName}, by executing tools and providing information.

CURRENT WORKSPACE: ${workspace}

AVAILABLE TOOLS:
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
Wait for the result before proceeding.

If you have a final answer, just provide it as plain text.
`;
  }

  static formatToolResult(name: string, result: string): string {
    return `<tool_result name="${name}">\n${result}\n</tool_result>`;
  }
}
