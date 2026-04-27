import { ToolCall, TOOL_CALL_START, TOOL_CALL_END } from "./protocol";

export class ToolCallParser {
  /**
   * Parses a tool call from the LLM text.
   * Expects format: <tool_call>{ "name": "...", "arguments": { ... } }</tool_call>
   */
  static parse(text: string): ToolCall | null {
    // Look for <tool_call tag, possibly with attributes
    const toolCallRegex = /<tool_call(?:\s+name="(?<name>[^"]+)")?(?:\s+id="(?<id>[^"]+)")?\s*>(?<body>[\s\S]*?)(?:<\/tool_call>|$)/i;
    const match = text.match(toolCallRegex);
    
    if (!match) return null;

    const { name, body } = match.groups || {};
    const trimmedBody = (body || "").trim();

    try {
      // Case 1: Attributes format <tool_call name="..." id="...">JSON_ARGS</tool_call>
      if (name) {
        let args = {};
        if (trimmedBody) {
          try {
            args = JSON.parse(trimmedBody);
          } catch (e) {
            // If body is not valid JSON, maybe it's just raw text or malformed
            // We can try to extract JSON from it if needed, but for now just return null if invalid
            return null;
          }
        }
        return { name, arguments: args };
      }

      // Case 2: JSON body format <tool_call>{ "name": "...", "arguments": { ... } }</tool_call>
      if (trimmedBody) {
        const parsed = JSON.parse(trimmedBody);
        if (parsed.name && typeof parsed.name === 'string') {
          let args = parsed.arguments || {};
          
          if (Object.keys(args).length === 0) {
              const topLevelArgs = { ...parsed };
              delete topLevelArgs.name;
              delete topLevelArgs.arguments;
              if (Object.keys(topLevelArgs).length > 0) {
                  args = topLevelArgs;
              }
          }

          return {
            name: parsed.name,
            arguments: args
          };
        }
      }
    } catch (e: any) {
      return null;
    }

    return null;
  }
}
