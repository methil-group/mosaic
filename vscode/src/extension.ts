import * as vscode from 'vscode';
import { ChatViewProvider } from './webview/chatViewProvider';

export function activate(context: vscode.ExtensionContext) {
  const provider = new ChatViewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('mosaic.focusChat', () => {
      vscode.commands.executeCommand('mosaic.chatView.focus');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('mosaic.resetChat', () => {
      provider.resetChat();
    })
  );

  console.log('Mosaic extension is now active!');
}

export function deactivate() {
  // Logic to dispose of global state or stop agents if necessary is handled by individual subscriptions
}
