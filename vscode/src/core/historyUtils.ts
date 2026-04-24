import { MessageContentPart, MessageContentType } from "./session";

export class HistoryUtils {
    /**
     * Parses a raw message string into structured parts.
     */
    static parseContent(text: string, role: 'user' | 'assistant' | 'system'): MessageContentPart[] {
        if (!text) return [];

        const parts: MessageContentPart[] = [];
        // Matches <thought>, <tool_call>, or <tool_response>/<tool_result>
        const blockRegex = /<(thought|tool_call|tool_response|tool_result)[\s\S]*?(?:<\/\1>|$)/g;

        let lastIdx = 0;
        let match;

        while ((match = blockRegex.exec(text)) !== null) {
            // Add preceding text as a message part
            if (match.index > lastIdx) {
                const content = text.substring(lastIdx, match.index).trim();
                if (content) {
                    parts.push({ type: 'message', content });
                }
            }

            const tag = match[1];
            const fullContent = match[0];
            
            let type: MessageContentType = 'message';
            if (tag === 'thought') type = 'thought';
            else if (tag === 'tool_call') type = 'tool_call';
            else if (tag === 'tool_response' || tag === 'tool_result') {
                type = 'user_tool_result';
            }

            parts.push({ type, content: fullContent });
            lastIdx = blockRegex.lastIndex;
        }

        // Add remaining text
        if (lastIdx < text.length) {
            const content = text.substring(lastIdx).trim();
            if (content) {
                parts.push({ type: 'message', content });
            }
        }

        return parts;
    }
}
