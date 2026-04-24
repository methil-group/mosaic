import * as vscode from 'vscode';
import { renderSetupScreen } from './ui/setupScreen';
import { renderChatScreen } from './ui/chatScreen';
import { getClientJs } from './ui/mosaicUI';

export class WebviewHandler {
    constructor(private readonly _extensionUri: vscode.Uri) {}

    public getHtmlForWebview(webview: vscode.Webview, setupRequired: boolean, provider?: string, apiKey?: string, currentModel?: string): string {
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'chat.css'));
        const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css'));
        const nonce = this._getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; script-src ${webview.cspSource} 'nonce-${nonce}' https://cdn.jsdelivr.net; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource};">
    <link href="${styleUri}" rel="stylesheet">
    <link href="${codiconsUri}" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js" nonce="${nonce}"></script>
    <title>Mosaic Chat</title>
</head>
<body>
    <div id="chat-container">
        ${setupRequired ? renderSetupScreen(provider, apiKey) : renderChatScreen(provider, currentModel)}
    </div>
    <script nonce="${nonce}">
        ${getClientJs(currentModel)}
    </script>
</body>
</html>`;
    }

    private _getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}
