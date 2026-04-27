import * as assert from 'assert';
import { SessionManager } from '../../core/session';

suite('Parsing & Filtering Test Suite', () => {
    let sessionManager: any;

    setup(() => {
        // Mocking dependencies for SessionManager if needed
        sessionManager = new SessionManager('/tmp/mosaic-tests');
    });

    test('Should filter out stray bracket messages', () => {
        const text = "<<\n<thought>\nI will list files.\n</thought>\n<";
        // Accessing private method for testing
        const parts = (sessionManager as any)._parseContent(text);
        
        // Should contain only the thought part
        assert.strictEqual(parts.length, 1);
        assert.strictEqual(parts[0].type, 'thought');
        assert.strictEqual(parts[0].content, '<thought>\nI will list files.\n</thought>');
    });

    test('Should normalize malformed tags', () => {
        const text = "<<<tool_call name=\"test\">{}</tool_call>";
        const parts = (sessionManager as any)._parseContent(text);
        
        assert.strictEqual(parts.length, 1);
        assert.strictEqual(parts[0].type, 'tool_call');
        assert.strictEqual(parts[0].content, '<tool_call name="test">{}</tool_call>');
    });

    test('Should group consecutive tool calls in renderer-like logic', () => {
        const text = "<tool_call name=\"t1\">{}</tool_call>\n\n<tool_call name=\"t2\">{}</tool_call>";
        const parts = (sessionManager as any)._parseContent(text);
        
        // SessionManager doesn't group, but it should have 2 tool_call parts and NO whitespace parts between them
        // because our new logic filters out whitespace-only message blocks
        assert.strictEqual(parts.length, 2);
        assert.strictEqual(parts[0].type, 'tool_call');
        assert.strictEqual(parts[1].type, 'tool_call');
    });

    test('Should preserve real content between tags', () => {
        const text = "<thought>T</thought>\nImportant note\n<tool_call name=\"t\">{}</tool_call>";
        const parts = (sessionManager as any)._parseContent(text);
        
        assert.strictEqual(parts.length, 3);
        assert.strictEqual(parts[0].type, 'thought');
        assert.strictEqual(parts[1].type, 'message');
        assert.strictEqual(parts[1].content, 'Important note');
        assert.strictEqual(parts[2].type, 'tool_call');
    });
});
