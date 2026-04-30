import { ToolCall } from "./protocol";

export class ToolCallParser {
  /**
   * Parses a tool call from the LLM text.
   * Expects format: <tool_call>{ "name": "...", "arguments": { ... } }</tool_call>
   */
  static parse(text: string): { toolCall: ToolCall | null, error?: string } {
    // Look for <tool_call tag, possibly with attributes
    const toolCallRegex = /<tool_call(?:\s+name="(?<name>[^"]+)")?(?:\s+id="(?<id>[^"]+)")?\s*>(?<body>[\s\S]*?)(?:<\/tool_call>|$)/i;
    const match = text.match(toolCallRegex);
    
    if (!match) return { toolCall: null };

    const { name, body } = match.groups || {};
    const trimmedBody = (body || "").trim();

    if (!trimmedBody && !name) return { toolCall: null };

    try {
      // Case 1: Attributes format <tool_call name="..." id="...">JSON_ARGS</tool_call>
      if (name) {
        let args = {};
        if (trimmedBody) {
          try {
            args = JSON.parse(trimmedBody);
          } catch (e: any) {
            // Try to extract JSON if there's garbage
            const extracted = this.extractJson(trimmedBody);
            if (extracted) {
              try {
                args = JSON.parse(extracted);
              } catch (e2: any) {
                return { toolCall: null, error: e.message };
              }
            } else {
              return { toolCall: null, error: e.message };
            }
          }
        }
        return { toolCall: { name, arguments: args } };
      }

      // Case 2: JSON body format <tool_call>{ "name": "...", "arguments": { ... } }</tool_call>
      if (trimmedBody) {
        const jsonToParse = trimmedBody;
        let parsed: any;
        try {
          parsed = JSON.parse(jsonToParse);
        } catch (e: any) {
          const extracted = this.extractJson(trimmedBody);
          if (extracted) {
            try {
              parsed = JSON.parse(extracted);
            } catch (e2: any) {
              return { toolCall: null, error: e.message };
            }
          } else {
            return { toolCall: null, error: e.message };
          }
        }

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
            toolCall: {
              name: parsed.name,
              arguments: args
            }
          };
        }
      }
    } catch (e: any) {
      return { toolCall: null, error: e.message };
    }

    return { toolCall: null };
  }

  private static extractJson(text: string): string | null {
    const firstBrace = text.indexOf('{');
    if (firstBrace === -1) return null;

    const lastBrace = text.lastIndexOf('}');
    if (lastBrace === -1 || lastBrace < firstBrace) return null;

    return text.substring(firstBrace, lastBrace + 1);
  }
}
