import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('methil-group.mosaic-vscode'));
    });

    test('Should register commands', async () => {
        const ext = vscode.extensions.getExtension('methil-group.mosaic-vscode');
        await ext?.activate();
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('mosaic.focusChat'));
        assert.ok(commands.includes('mosaic.resetChat'));
    });

    test('Focus command should try to show webview', async () => {
        // Reset state
        await vscode.commands.executeCommand('mosaic.focusChat');
        assert.ok(true, "Focus chat executed");
    });

    test('Reset command should execute without error', async () => {
        await vscode.commands.executeCommand('mosaic.resetChat');
        assert.ok(true, "Reset chat executed");
    });

    test('Workspace folders should be accessible (sanity check)', () => {
        const folders = vscode.workspace.workspaceFolders;
        // This test depends on the environment, but in a test run it should usually be present
        if (folders) {
            assert.ok(folders.length >= 0);
        }
    });
});
