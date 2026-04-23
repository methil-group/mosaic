export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResponse {
  tool_call_id: string;
  name: string;
  content: any;
}

export const TOOL_CALL_START = "<tool_call>";
export const TOOL_CALL_END = "</tool_call>";
export const TOOL_RESPONSE_START = "<tool_response>";
export const TOOL_RESPONSE_END = "</tool_response>";
