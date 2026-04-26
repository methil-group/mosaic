import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { getClientJs } from '../../webview/ui/mosaicUI';

suite('Webview Integration Test Suite', () => {
    test('getClientJs should load all modular files', () => {
        // Mock extension context / uri
        const extensionPath = path.resolve(__dirname, '../../../');
        const extensionUri = vscode.Uri.file(extensionPath);
        
        const js = getClientJs(extensionUri, 'test-model');
        
        assert.ok(js.includes('class MosaicUI'), 'Should contain MosaicUI class');
        assert.ok(js.includes('function renderMarkdown'), 'Should contain renderMarkdown function');
        assert.ok(js.includes('function log'), 'Should contain log function');
        assert.ok(js.includes('test-model'), 'Should contain the current model name');
        assert.ok(!js.includes('Error reading Mosaic UI JS files'), 'Should not contain error message');
    });
});
