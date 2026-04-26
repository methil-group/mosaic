import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function getClientJs(extensionUri: vscode.Uri, currentModel?: string): string {
    const jsDir = path.join(extensionUri.fsPath, 'assets', 'webview', 'js');
    
    try {
        // Read the modular JS files
        const loggerJs = fs.readFileSync(path.join(jsDir, 'logger.js'), 'utf8');
        const rendererJs = fs.readFileSync(path.join(jsDir, 'renderer.js'), 'utf8');
        const mosaicUiJs = fs.readFileSync(path.join(jsDir, 'mosaic-ui.js'), 'utf8');

        return `(function() {
    const vscode = acquireVsCodeApi();
    
    // --- Logger & Error Handlers ---
    ${loggerJs}

    // --- Renderer Logic ---
    ${rendererJs}

    // --- Main UI Class ---
    ${mosaicUiJs}

    // Initialize the UI
    const ui = new MosaicUI("${currentModel || ''}");
})();`;
    } catch (err) {
        console.error('Error reading Mosaic UI JS files:', err);
        return `console.error('Mosaic UI failed to load JS files. Path: ${jsDir}', ${JSON.stringify(err)});`;
    }
}
