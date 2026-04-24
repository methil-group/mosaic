import { ToolCall, TOOL_CALL_START, TOOL_CALL_END } from "./protocol";

export class ToolCallParser {
  /**
   * Parses a tool call from the LLM text.
   * Expects format: <tool_call>{ "name": "...", "arguments": { ... } }</tool_call>
   */
  static parse(text: string): ToolCall | null {
    const startIndex = text.indexOf(TOOL_CALL_START);
    const endIndex = text.lastIndexOf(TOOL_CALL_END);

    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
      return null;
    }

    const content = text.slice(startIndex + TOOL_CALL_START.length, endIndex).trim();
    try {
      const parsed = JSON.parse(content);
      if (parsed.name && typeof parsed.name === 'string') {
        return {
          name: parsed.name,
          arguments: parsed.arguments || {}
        };
      }
    } catch (e: any) {
      return null;
    }

    return null;
  }
}
