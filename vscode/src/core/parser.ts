import { ToolCall, TOOL_CALL_START, TOOL_CALL_END } from "./protocol";

export class ToolCallParser {
  /**
   * Parses a tool call from the LLM text.
   * Expects format: <tool_call>{ "name": "...", "arguments": { ... } }</tool_call>
   */
  static parse(text: string): ToolCall | null {
    const startIndex = text.indexOf(TOOL_CALL_START);
    if (startIndex === -1) return null;

    // Search for any form of closing tag: </tool_call>, </tool_call, or even just a newline if followed by a result
    let endIndex = text.indexOf(TOOL_CALL_END, startIndex);
    if (endIndex === -1) {
        const partialTags = ["</tool_call", "tool_call>", "</tool_call>"];
        for (const tag of partialTags) {
            const idx = text.indexOf(tag, startIndex);
            if (idx !== -1) {
                endIndex = idx;
                break;
            }
        }
    }

    if (endIndex === -1 || endIndex <= startIndex) {
        // Fallback: if no closing tag is found, check if there's a JSON block ending with }
        const lastBrace = text.lastIndexOf("}");
        if (lastBrace > startIndex) {
            endIndex = lastBrace + 1;
        } else {
            return null;
        }
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
