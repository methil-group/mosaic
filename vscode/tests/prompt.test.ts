import { PromptBuilder } from '../src/core/prompt';
import { TOOL_CALL_START, TOOL_CALL_END, TOOL_RESPONSE_START, TOOL_RESPONSE_END } from '../src/core/protocol';

describe('PromptBuilder', () => {
  describe('createSystemPrompt', () => {
    it('should include all tool descriptions', () => {
      const tools = [
        { name: 'read_file', description: 'Read a file' },
        { name: 'write_file', description: 'Write a file' },
      ];
      const prompt = PromptBuilder.createSystemPrompt(tools, '/workspace', 'Alice');
      expect(prompt).toContain('- read_file: Read a file');
      expect(prompt).toContain('- write_file: Write a file');
    });

    it('should include workspace path', () => {
      const prompt = PromptBuilder.createSystemPrompt([], '/my/project', 'Bob');
      expect(prompt).toContain('/my/project');
    });

    it('should include user name', () => {
      const prompt = PromptBuilder.createSystemPrompt([], '/ws', 'Charlie');
      expect(prompt).toContain('Charlie');
    });

    it('should include tool call format markers', () => {
      const prompt = PromptBuilder.createSystemPrompt([], '/ws', 'U');
      expect(prompt).toContain(TOOL_CALL_START);
      expect(prompt).toContain(TOOL_CALL_END);
    });

    it('should include tool response format markers', () => {
      const prompt = PromptBuilder.createSystemPrompt([], '/ws', 'U');
      expect(prompt).toContain(TOOL_RESPONSE_START);
      expect(prompt).toContain(TOOL_RESPONSE_END);
    });
  });

  describe('formatToolResult', () => {
    it('should format a string result correctly', () => {
      const output = PromptBuilder.formatToolResult('read_file', 'file contents here', 'call-123');
      expect(output).toContain(TOOL_RESPONSE_START);
      expect(output).toContain(TOOL_RESPONSE_END);
      const inner = JSON.parse(output.replace(TOOL_RESPONSE_START, '').replace(TOOL_RESPONSE_END, '').trim());
      expect(inner.tool_call_id).toBe('call-123');
      expect(inner.name).toBe('read_file');
      expect(inner.content.message).toBe('file contents here');
    });

    it('should format an object result correctly', () => {
      const resultObj = { success: true, data: [1, 2, 3] };
      const output = PromptBuilder.formatToolResult('run_command', resultObj, 'call-456');
      const inner = JSON.parse(output.replace(TOOL_RESPONSE_START, '').replace(TOOL_RESPONSE_END, '').trim());
      expect(inner.content).toEqual(resultObj);
    });

    it('should parse JSON string results into objects', () => {
      const jsonStr = JSON.stringify({ message: 'Command sent' });
      const output = PromptBuilder.formatToolResult('run_command', jsonStr, 'call-789');
      const inner = JSON.parse(output.replace(TOOL_RESPONSE_START, '').replace(TOOL_RESPONSE_END, '').trim());
      expect(inner.content.message).toBe('Command sent');
    });
  });
});
