import * as vscode from 'vscode';
import { ChatViewProvider } from '../src/webview/chatViewProvider';
import { SessionManager } from '../src/core/session';

// Mock dependencies
jest.mock('vscode');
jest.mock('../src/core/session');

describe('ChatViewProvider Interaction', () => {
    let provider: ChatViewProvider;
    let mockContext: any;
    let mockWebviewView: any;

    beforeEach(() => {
        (vscode.workspace as any).workspaceFolders = [{
            uri: { fsPath: '/test-workspace' },
            name: 'test',
            index: 0
        }];
        const fs = require('fs');
        jest.spyOn(fs, 'mkdirSync').mockImplementation();
        jest.spyOn(fs, 'writeFileSync').mockImplementation();

        mockContext = {
            extensionUri: { fsPath: '/test' },
            globalState: {
                get: jest.fn().mockImplementation((key) => {
                    if (key === 'mosaic.provider') return 'openrouter';
                    if (key === 'mosaic.model') return 'gpt-4o';
                    return undefined;
                }),
                update: jest.fn()
            }
        };

        mockWebviewView = {
            webview: {
                options: {},
                onDidReceiveMessage: jest.fn(),
                postMessage: jest.fn(),
                asWebviewUri: jest.fn().mockReturnValue({ toString: () => 'uri' }),
                cspSource: 'test-src',
                html: ''
            }
        };

        provider = new ChatViewProvider(mockContext as any);
    });

    it('should initialize and register message listeners', () => {
        provider.resolveWebviewView(mockWebviewView as any, {} as any, {} as any);
        expect(mockWebviewView.webview.onDidReceiveMessage).toHaveBeenCalled();
    });

    it('should reset session when reset command is triggered', () => {
        provider.resolveWebviewView(mockWebviewView as any, {} as any, {} as any);
        provider.resetChat();
        // Accessing private property for test verification
        expect((provider as any)._sessionManager).toBeUndefined();
    });

    it('should handle sendMessage by initializing a session', async () => {
        provider.resolveWebviewView(mockWebviewView as any, {} as any, {} as any);
        
        // Simulate message from webview (clicking Send)
        const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
        
        // This will trigger _handleSendMessage
        // We use a try/catch because the actual LLM call will fail in mock environment
        try {
            await messageHandler({ type: 'sendMessage', value: 'Hello' });
        } catch(e) {}

        expect((provider as any)._sessionManager).toBeDefined();
    });

    it('should list chats from .mosaic/chats', async () => {
        const fs = require('fs');
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs, 'readdirSync').mockReturnValue(['chat_20240101.json'] as any);
        jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ title: 'Test Title' }));
        
        provider.resolveWebviewView(mockWebviewView as any, {} as any, {} as any);
        const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
        
        await messageHandler({ type: 'listChats' });
        
        expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(expect.objectContaining({
            type: 'chatList',
            chats: expect.arrayContaining([expect.objectContaining({ id: 'chat_20240101.json', name: 'Test Title' })])
        }));
    });

    it('should load a chat and populate messages', async () => {
        const fs = require('fs');
        const mockChat = {
            history: [
                { role: 'user', content: 'Preloaded User' },
                { role: 'assistant', content: 'Preloaded Assistant' }
            ]
        };
        jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockChat));
        
        provider.resolveWebviewView(mockWebviewView as any, {} as any, {} as any);
        const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
        
        await messageHandler({ type: 'loadChat', value: 'chat_20240101.json' });
        
        expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'clearMessages' }));
        expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(expect.objectContaining({ role: 'user', content: 'Preloaded User' }));
        expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(expect.objectContaining({ role: 'assistant', content: 'Preloaded Assistant' }));
    });
});
