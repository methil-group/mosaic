import { Tool } from '../../Tools/Tool';
import { PromptPart } from './PromptPart';

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
