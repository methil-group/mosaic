import { TOOL_CALL_START, TOOL_CALL_END, TOOL_RESPONSE_START, TOOL_RESPONSE_END } from '../src/core/protocol';

describe('Protocol Constants', () => {
  it('should have correct tool call tags', () => {
    expect(TOOL_CALL_START).toBe('<tool_call>');
    expect(TOOL_CALL_END).toBe('</tool_call>');
  });

  it('should have correct tool response tags', () => {
    expect(TOOL_RESPONSE_START).toBe('<tool_response>');
    expect(TOOL_RESPONSE_END).toBe('</tool_response>');
  });

  it('tags should be proper XML-like pairs', () => {
    // Ensure end tags are the same as start tags but with /
    expect(TOOL_CALL_END).toBe(TOOL_CALL_START.replace('<', '</'));
    expect(TOOL_RESPONSE_END).toBe(TOOL_RESPONSE_START.replace('<', '</'));
  });
});
