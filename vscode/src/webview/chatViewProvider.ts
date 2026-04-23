import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Agent, StreamEvent } from '../core/agent';
import { SessionManager } from '../core/session';
import { LMStudioProvider, OpenRouterProvider } from '../framework/llm/provider';
import { ReadFileTool, WriteFileTool, EditFileTool, ListDirectoryTool } from '../core/tools/fileTools';
import { RunCommandTool } from '../core/tools/runCommand';
import { CreateTodoTool, UpdateTodoTool, ListTodosTool, DeleteTodoTool, TodoManager } from '../core/tools/todoTools';
import { WebviewHandler } from './webviewHandler';

export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'mosaic.chatView';
  private _view?: vscode.WebviewView;
  private _activeAgent?: Agent;
  private _sessionManager?: SessionManager;
  private readonly _webviewHandler: WebviewHandler;

  constructor(private readonly _context: vscode.ExtensionContext) {
    this._webviewHandler = new WebviewHandler(_context.extensionUri);
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._context.extensionUri]
    };

    this._initializeWorkspace();
    this.refresh();

    webviewView.webview.onDidReceiveMessage(async (data) => {
      console.log(`[Mosaic DEBUG] Received: ${data.type}`);
      try {
        await this._handleWebviewMessage(data);
      } catch (e) {
        console.error(`[Mosaic ERROR] Message handler failed:`, e);
      }
    });
  }

  public resetChat() {
    this._sessionManager = undefined;
    this.refresh();
  }

  private _initializeWorkspace() {
    const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (workspacePath) {
      const mosaicDir = path.join(workspacePath, '.mosaic');
      const dirs = [mosaicDir, path.join(mosaicDir, 'chats'), path.join(mosaicDir, 'logs')];
      dirs.forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      });
    }
  }

  public refresh() {
    if (!this._view) return;

    const provider = this._context.globalState.get<string>('mosaic.provider');
    const apiKey = this._context.globalState.get<string>('mosaic.openrouterApiKey') || '';
    const model = this._context.globalState.get<string>('mosaic.model') || '';
    const setupRequired = !provider || (!apiKey && provider === 'openrouter');

    this._view.webview.html = this._webviewHandler.getHtmlForWebview(
      this._view.webview,
      setupRequired,
      provider,
      apiKey,
      model
    );
  }

  private async _handleWebviewMessage(data: any) {
    switch (data.type) {
      case 'sendMessage': return this._handleSendMessage(data.value);
      case 'stopGeneration': return this._handleStopGeneration();
      case 'setProvider':
        await this._context.globalState.update('mosaic.provider', data.value);
        this.refresh();
        break;
      case 'setModel':
        await this._context.globalState.update('mosaic.model', data.value);
        break;
      case 'setApiKey':
        await this._context.globalState.update('mosaic.openrouterApiKey', data.value);
        this.refresh();
        break;
      case 'fetchModels': return this._handleFetchModels();
      case 'listChats': return this._handleListChats();
      case 'loadChat': return this._handleLoadChat(data.value);
      case 'listTodos': return this._handleListTodos();
      case 'resetChat':
        this.resetChat();
        break;
      case 'webviewError':
        console.error(`[Mosaic WEBVIEW ERROR] ${data.message}`, data.stack);
        break;
    }
  }

  private _handleStopGeneration() {
    if (this._activeAgent) {
      this._activeAgent.stop();
      this._activeAgent = undefined;
      this._view?.webview.postMessage({ type: 'generationStopped' });
    }
  }

  private async _handleFetchModels() {
    if (!this._view) return;
    this._view.webview.postMessage({ type: 'setAvailableModels', models: [], loading: true });

    const providerType = this._context.globalState.get<string>('mosaic.provider') || 'openrouter';
    const apiKey = this._context.globalState.get<string>('mosaic.openrouterApiKey') || '';
    const llmProvider = providerType === 'lmstudio' ? new LMStudioProvider() : new OpenRouterProvider(apiKey);

    try {
      const models = await llmProvider.fetchModels();
      let currentModel = this._context.globalState.get<string>('mosaic.model');
      if (models.length > 0 && (!currentModel || !models.includes(currentModel))) {
        await this._context.globalState.update('mosaic.model', models[0]);
        currentModel = models[0];
      }
      this._view.webview.postMessage({ type: 'setAvailableModels', models, currentModel });
    } catch (e) {
      this._view.webview.postMessage({ type: 'setAvailableModels', models: [], error: true });
    }
  }

  private async _handleListChats() {
    if (!this._view) return;
    const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';
    const chatDir = path.join(workspacePath, '.mosaic', 'chats');
    if (!fs.existsSync(chatDir)) return this._view.webview.postMessage({ type: 'chatList', chats: [] });

    const files = fs.readdirSync(chatDir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const sess = JSON.parse(fs.readFileSync(path.join(chatDir, f), 'utf-8'));
        return { id: f, name: sess.title || f.replace('.json', '') };
      })
      .sort((a, b) => b.id.localeCompare(a.id));
    this._view.webview.postMessage({ type: 'chatList', chats: files });
  }

  private async _handleLoadChat(chatId: string) {
    if (!this._view) return;
    const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';
    const chatFile = path.join(workspacePath, '.mosaic', 'chats', chatId);

    try {
      const session = JSON.parse(fs.readFileSync(chatFile, 'utf-8'));
      
      // Properly restore manager
      const sessionId = chatId.replace('chat_', '').replace('.json', '');
      this._sessionManager = new SessionManager(workspacePath, sessionId);
      this._sessionManager.restoreHistory(session.history);

      this._view.webview.postMessage({ type: 'clearMessages' });
      this._view.webview.postMessage({ type: 'setTitle', title: session.title || 'Untitled' });
      session.history.forEach((msg: any) => {
        this._view?.webview.postMessage({ type: 'addMessage', role: msg.role, content: msg.content });
      });
      this._view.webview.postMessage({ type: 'addSystemMessage', content: `Loaded chat: ${session.title || chatId}` });
    } catch (e) {
      this._view.webview.postMessage({ type: 'addSystemMessage', content: 'Failed to load chat.' });
    }
  }

  private async _handleListTodos() {
    if (!this._view) return;
    const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';
    const manager = new TodoManager(workspacePath);
    this._view.webview.postMessage({ type: 'todoList', todos: manager.getTodos() });
  }

  private async _handleSendMessage(text: string) {
    if (!this._view) return;

    const providerType = this._context.globalState.get<string>('mosaic.provider') || 'openrouter';
    const apiKey = this._context.globalState.get<string>('mosaic.openrouterApiKey') || '';
    const model = this._context.globalState.get<string>('mosaic.model') || 'gpt-4o';
    const llmProvider = providerType === 'lmstudio' ? new LMStudioProvider() : new OpenRouterProvider(apiKey);

    const tools = [
      new ReadFileTool(), new WriteFileTool(), new EditFileTool(),
      new ListDirectoryTool(), new RunCommandTool(), new CreateTodoTool(),
      new UpdateTodoTool(), new ListTodosTool(), new DeleteTodoTool()
    ];

    const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';
    if (!this._sessionManager && workspacePath) {
      this._sessionManager = new SessionManager(workspacePath);
      this._sessionManager.log('system', `Session started: ${model}`);
    }

    if (this._sessionManager) {
      this._sessionManager.addMessage('user', text);
      if ((this._sessionManager as any).history.length === 2) {
        this._generateTitle(llmProvider, model, text).then(title => {
          if (title && this._view) this._view.webview.postMessage({ type: 'setTitle', title });
        });
      }
    }

    const history = this._sessionManager ? this._sessionManager.getHistory() : [];
    this._activeAgent = new Agent(llmProvider, model, workspacePath, "User", tools, history);
    this._view.webview.postMessage({ type: 'addMessage', role: 'user', content: text });

    const assistantId = `msg-${Date.now()}`;
    let fullContent = '';
    this._view.webview.postMessage({ type: 'addMessage', role: 'assistant', content: '', id: assistantId });

    try {
      await this._activeAgent.run(text, async (event: StreamEvent) => {
        if (!this._view) return;
        switch (event.type) {
          case 'token':
            fullContent += event.data;
            this._view.webview.postMessage({ type: 'updateMessage', id: assistantId, content: event.data });
            break;
          case 'tool_started': {
            const marker = `\n<tool_call name="${event.name}" id="${event.call_id}">\n${JSON.stringify(event.parameters, null, 2)}\n</tool_call>\n`;
            fullContent += marker;
            this._view.webview.postMessage({ type: 'updateMessage', id: assistantId, content: marker });
            break;
          }
          case 'tool_finished': {
            const marker = `\n<tool_result id="${event.call_id}">\n${typeof event.result === 'string' ? event.result : JSON.stringify(event.result, null, 2)}\n</tool_result>\n`;
            fullContent += marker;
            this._view.webview.postMessage({ type: 'updateMessage', id: assistantId, content: marker });
            break;
          }
          case 'final_answer':
            this._view.webview.postMessage({ type: 'generationFinished' });
            break;
          case 'error':
            this._view.webview.postMessage({ type: 'addMessage', role: 'system', content: `❌ Agent Error: ${event.message}` });
            this._view.webview.postMessage({ type: 'generationFinished' });
            break;
        }
      });
    } catch (e: any) {
      this._view?.webview.postMessage({ type: 'addMessage', role: 'system', content: `❌ Error: ${e.message}` });
    } finally {
      if (this._sessionManager && fullContent) this._sessionManager.addMessage('assistant', fullContent);
      this._view?.webview.postMessage({ type: 'generationFinished' });
      this._activeAgent = undefined;
    }
  }

  private async _generateTitle(provider: any, model: string, text: string) {
    try {
      const prompt = `Summarize this in 3-5 words: "${text}". Only the title.`;
      let title = "";
      for await (const event of provider.streamChat(model, [{ role: 'user', content: prompt }])) {
        if (event.type === 'token') title += event.data;
      }
      if (title && this._sessionManager) this._sessionManager.setTitle(title.trim());
      return title.trim();
    } catch (e) {
      return "New Chat";
    }
  }
}
