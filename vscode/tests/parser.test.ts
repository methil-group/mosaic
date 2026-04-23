import { ToolCallParser } from '../src/core/parser';
import { TOOL_CALL_START, TOOL_CALL_END } from '../src/core/protocol';

describe('ToolCallParser', () => {
  // --- Valid cases ---
  it('should parse a valid tool call', () => {
    const text = `Some thoughts... ${TOOL_CALL_START}{"name": "read_file", "arguments": {"path": "test.js"}}${TOOL_CALL_END}`;
    const result = ToolCallParser.parse(text);
    expect(result).toEqual({
      name: 'read_file',
      arguments: { path: 'test.js' }
    });
  });

  it('should parse tool call with empty arguments', () => {
    const text = `${TOOL_CALL_START}{"name": "list_directory", "arguments": {}}${TOOL_CALL_END}`;
    const result = ToolCallParser.parse(text);
    expect(result).toEqual({ name: 'list_directory', arguments: {} });
  });

  it('should parse tool call with no arguments key at all', () => {
    const text = `${TOOL_CALL_START}{"name": "list_directory"}${TOOL_CALL_END}`;
    const result = ToolCallParser.parse(text);
    expect(result).toEqual({ name: 'list_directory', arguments: {} });
  });

  it('should parse when there is text before AND after the tags', () => {
    const text = `I will read the file now. ${TOOL_CALL_START}{"name": "read_file", "arguments": {"path": "main.ts"}}${TOOL_CALL_END} Done.`;
    const result = ToolCallParser.parse(text);
    expect(result).toEqual({ name: 'read_file', arguments: { path: 'main.ts' } });
  });

  it('should parse with leading/trailing whitespace inside tags', () => {
    const text = `${TOOL_CALL_START}   \n  {"name": "write_file", "arguments": {"path": "a.ts", "content": "hi"}}  \n  ${TOOL_CALL_END}`;
    const result = ToolCallParser.parse(text);
    expect(result).toEqual({ name: 'write_file', arguments: { path: 'a.ts', content: 'hi' } });
  });

  it('should handle nested JSON in arguments', () => {
    const text = `${TOOL_CALL_START}{"name": "edit_file", "arguments": {"path": "a.ts", "edits": [{"line": 1, "text": "foo"}]}}${TOOL_CALL_END}`;
    const result = ToolCallParser.parse(text);
    expect(result?.name).toBe('edit_file');
    expect(result?.arguments.edits).toEqual([{ line: 1, text: 'foo' }]);
  });

  // --- Invalid / edge cases ---
  it('should return null for malformed JSON', () => {
    const text = `${TOOL_CALL_START}{"name": "missing_bracket"${TOOL_CALL_END}`;
    const result = ToolCallParser.parse(text);
    expect(result).toBeNull();
  });

  it('should return null when tags are missing', () => {
    const text = 'Just some regular text with no tool calls';
    const result = ToolCallParser.parse(text);
    expect(result).toBeNull();
  });

  it('should return null when only start tag is present', () => {
    const text = `${TOOL_CALL_START}{"name": "read_file"}`;
    const result = ToolCallParser.parse(text);
    expect(result).toBeNull();
  });

  it('should return null when only end tag is present', () => {
    const text = `{"name": "read_file"}${TOOL_CALL_END}`;
    const result = ToolCallParser.parse(text);
    expect(result).toBeNull();
  });

  it('should return null when name is missing', () => {
    const text = `${TOOL_CALL_START}{"arguments": {"path": "test.ts"}}${TOOL_CALL_END}`;
    const result = ToolCallParser.parse(text);
    expect(result).toBeNull();
  });

  it('should return null when name is not a string', () => {
    const text = `${TOOL_CALL_START}{"name": 123, "arguments": {}}${TOOL_CALL_END}`;
    const result = ToolCallParser.parse(text);
    expect(result).toBeNull();
  });

  it('should return null for empty content between tags', () => {
    const text = `${TOOL_CALL_START}${TOOL_CALL_END}`;
    const result = ToolCallParser.parse(text);
    expect(result).toBeNull();
  });
});
