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
  private _ongoingMessage?: { id: string, role: string, content: string };

  constructor(private readonly _context: vscode.ExtensionContext) {
    this._webviewHandler = new WebviewHandler(_context.extensionUri);
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView
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
        if (data.type === 'ready') {
          this._handleGetHistory();
          this._handleListChats();
          if (this._ongoingMessage) {
            this._view?.webview.postMessage({ 
              type: 'addMessage', 
              role: this._ongoingMessage.role, 
              content: this._ongoingMessage.content, 
              id: this._ongoingMessage.id 
            });
            this._view?.webview.postMessage({ type: 'generationStarted' });
          }
          return;
        }
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
    const lmStudioUrl = this._context.globalState.get<string>('mosaic.lmstudioBaseUrl') || 'http://localhost:1234/v1';
    const model = this._context.globalState.get<string>('mosaic.model') || '';
    const repoName = vscode.workspace.workspaceFolders?.[0]?.name || 'Mosaic';
    const noWorkspace = !vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0;
    const setupRequired = !provider || (!apiKey && provider === 'openrouter');

    const newHtml = this._webviewHandler.getHtmlForWebview(
      this._view.webview,
      setupRequired,
      repoName,
      provider,
      apiKey,
      model,
      noWorkspace,
      lmStudioUrl
    );

    if (this._view.webview.html !== newHtml) {
      this._view.webview.html = newHtml;
    }
  }

  private async _handleWebviewMessage(data: any) {
    switch (data.type) {
      case 'sendMessage': return this._handleSendMessage(data.value, data.model);
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
      case 'setLmStudioUrl':
        await this._context.globalState.update('mosaic.lmstudioBaseUrl', data.value);
        this.refresh();
        break;
      case 'fetchModels': return this._handleFetchModels();
      case 'getHistory': return this._handleGetHistory();
      case 'listChats': return this._handleListChats();
      case 'loadChat': return this._handleLoadChat(data.value);
      case 'deleteChat': return this._handleDeleteChat(data.value);
      case 'listTodos': return this._handleListTodos();
      case 'resetChat':
        this.resetChat();
        break;
      case 'updateTitle':
        if (this._sessionManager) {
          this._sessionManager.setTitle(data.value);
          this._view?.webview.postMessage({ type: 'setTitle', title: data.value });
          this._handleListChats();
        }
        break;
      case 'webviewLog':
        console.log(`[Mosaic WEBVIEW LOG] ${data.message}`, data.detail || '');
        break;
      case 'webviewError':
        console.error(`[Mosaic WEBVIEW ERROR] ${data.message}`, data.stack || '');
        break;
      case 'openFolder':
        vscode.commands.executeCommand('vscode.openFolder');
        break;
      case 'openFile':
        this._handleOpenFile(data.value);
        break;
      case 'searchFiles':
        return this._handleSearchFiles(data.value);
    }
  }

  private _handleOpenFile(filePath: string) {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot, filePath);
    
    vscode.workspace.openTextDocument(fullPath).then(
      doc => {
        vscode.window.showTextDocument(doc);
      },
      err => {
        vscode.window.showErrorMessage(`Failed to open file: ${filePath}. Error: ${err.message}`);
      }
    );
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
    const lmStudioUrl = this._context.globalState.get<string>('mosaic.lmstudioBaseUrl') || 'http://localhost:1234/v1';
    const llmProvider = providerType === 'lmstudio' ? new LMStudioProvider(lmStudioUrl) : new OpenRouterProvider(apiKey);

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
        const filePath = path.join(chatDir, f);
        const stats = fs.statSync(filePath);
        const sess = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        return { 
          id: f, 
          name: sess.title || f.replace('.json', ''),
          date: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
    this._view.webview.postMessage({ type: 'chatList', chats: files });
  }

  private async _handleDeleteChat(chatId: string) {
    if (!this._view) return;
    const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';
    const chatFile = path.join(workspacePath, '.mosaic', 'chats', chatId);
    if (fs.existsSync(chatFile)) {
      fs.unlinkSync(chatFile);
      this._handleListChats();
      this._sessionManager?.log('SYSTEM', `Deleted chat: ${chatId}`);
    }
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
      if (session.title) this._sessionManager.setTitle(session.title);

      this._view.webview.postMessage({ type: 'clearMessages' });
      this._view.webview.postMessage({ type: 'setTitle', title: session.title || 'Untitled' });
      
      // Auto-generate title if missing or default
      if (!session.title || session.title === 'New Chat' || session.title === 'Untitled') {
        const firstUserMsg = session.history.find((m: any) => m.role === 'user');
        if (firstUserMsg) {
          const providerType = this._context.globalState.get<string>('mosaic.provider') || 'openrouter';
          const apiKey = this._context.globalState.get<string>('mosaic.openrouterApiKey') || '';
          const lmStudioUrl = this._context.globalState.get<string>('mosaic.lmstudioBaseUrl') || 'http://localhost:1234/v1';
          const llmProvider = providerType === 'lmstudio' ? new LMStudioProvider(lmStudioUrl) : new OpenRouterProvider(apiKey);
          const model = this._context.globalState.get<string>('mosaic.model') || 'deepseek/deepseek-v4-flash';
          this._generateTitle(llmProvider, model, typeof firstUserMsg.content === 'string' ? firstUserMsg.content : (firstUserMsg.content[0]?.content || '')).then(title => {
            if (title && this._view) this._view.webview.postMessage({ type: 'setTitle', title });
          });
        }
      }

      session.history.forEach((msg: any) => {
        const msgId = msg.id || `msg-${Math.random()}`;
        this._view?.webview.postMessage({ 
          type: 'addMessage', 
          role: msg.role, 
          content: msg.content,
          id: msgId
        });
        if (msg.metadata) {
          this._view?.webview.postMessage({ 
            type: 'generationMetadata', 
            id: msgId, 
            metadata: msg.metadata 
          });
        }
      });
      this._sessionManager?.log('SYSTEM', `Loaded chat: ${session.title || chatId}`);
    } catch (e) {
      this._sessionManager?.log('ERROR', `Failed to load chat: ${e}`);
    }
  }

  private async _handleListTodos() {
    if (!this._view) return;
    const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';
    const manager = new TodoManager(workspacePath);
    this._view.webview.postMessage({ type: 'todoList', todos: manager.getTodos() });
  }

  private async _handleSearchFiles(query: string) {
    if (!this._view) return;
    
    // If query is empty or just '@', return some recent or common files
    // For now, let's just find files matching the query
    const pattern = query ? `**/*${query}*` : '**/*';
    const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 50);
    
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';
    const relativeFiles = files.map(f => path.relative(workspaceRoot, f.fsPath));
    
    this._view.webview.postMessage({ type: 'fileSuggestions', files: relativeFiles });
  }

  private async _handleGetHistory() {
    if (!this._view || !this._sessionManager) return;
    
    this._view.webview.postMessage({ type: 'clearMessages' });
    this._sessionManager.getHistory().forEach((msg: any) => {
      if (msg.role !== 'system') {
        this._view?.webview.postMessage({ type: 'addMessage', role: msg.role, content: msg.content });
      }
    });
  }

  private async _handleSendMessage(text: string, requestedModel?: string) {
    if (!this._view) return;

    const providerType = this._context.globalState.get<string>('mosaic.provider') || 'openrouter';
    const apiKey = this._context.globalState.get<string>('mosaic.openrouterApiKey') || '';
    const lmStudioUrl = this._context.globalState.get<string>('mosaic.lmstudioBaseUrl') || 'http://localhost:1234/v1';
    
    // Use requestedModel if provided, otherwise fallback to globalState
    const model = requestedModel || this._context.globalState.get<string>('mosaic.model') || 'deepseek/deepseek-v4-flash';
    
    // Ensure globalState is synced if a model was explicitly requested
    if (requestedModel && requestedModel !== this._context.globalState.get<string>('mosaic.model')) {
      await this._context.globalState.update('mosaic.model', requestedModel);
    }
    const llmProvider = providerType === 'lmstudio' ? new LMStudioProvider(lmStudioUrl) : new OpenRouterProvider(apiKey);

    const tools = [
      new ReadFileTool(), new WriteFileTool(), new EditFileTool(),
      new ListDirectoryTool(), new RunCommandTool(), new CreateTodoTool(),
      new UpdateTodoTool(), new ListTodosTool(), new DeleteTodoTool()
    ];

    const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';
    const workspaceName = vscode.workspace.workspaceFolders?.[0]?.name || 'Workspace';
    
    if (!this._sessionManager && workspacePath) {
      this._sessionManager = new SessionManager(workspacePath);
      this._sessionManager.log('system', `Session started: ${model}`);
    }

    const userMsgId = `msg-${Date.now()}-user`;
    if (this._sessionManager) {
      this._sessionManager.addMessage('user', text, undefined, userMsgId);
      if (this._sessionManager.getHistory().length === 2) {
        this._generateTitle(llmProvider, model, text).then(title => {
          if (title && this._view) this._view.webview.postMessage({ type: 'setTitle', title });
        });
      }
    }

    const history = this._sessionManager ? this._sessionManager.getHistory() : [];
    this._activeAgent = new Agent(llmProvider, model, workspaceName, "User", tools, history);
    this._view.webview.postMessage({ type: 'addMessage', role: 'user', content: text, id: userMsgId });

    // Log system info at start of message if session just started
    if (this._sessionManager && history.length <= 1) {
      this._sessionManager.logSystem({
        os: process.platform,
        vscodeVersion: vscode.version,
        extensionVersion: this._context.extension.packageJSON.version,
        model,
        provider: providerType,
        workspace: workspacePath // We still log the absolute path for system logs, but the agent doesn't see it.
      });
    }

    const assistantId = `msg-${Date.now()}`;
    let fullContent = '';
    this._ongoingMessage = { id: assistantId, role: 'assistant', content: '' };
    this._view.webview.postMessage({ type: 'addMessage', role: 'assistant', content: '', id: assistantId });

    const startTime = Date.now();
    let firstTokenTime: number | null = null;
    let lastUsage: any = null;

    try {
      await this._activeAgent.run(text, async (event: StreamEvent) => {
        if (!this._view) return;
        switch (event.type) {
          case 'token':
            if (firstTokenTime === null) firstTokenTime = Date.now();
            fullContent += event.data;
            if (this._ongoingMessage) this._ongoingMessage.content = fullContent;
            this._view.webview.postMessage({ type: 'updateMessage', id: assistantId, content: event.data });
            break;
          case 'log':
            if (this._sessionManager && event.message) {
              this._sessionManager.log('system', event.message);
              if (event.message.includes('Internal User Nudge:')) {
                const nudge = event.message.split('Internal User Nudge:')[1].trim();
                const marker = `\n\n[SYSTEM NUDGE]: ${nudge}\n\n`;
                fullContent += marker;
                if (this._ongoingMessage) this._ongoingMessage.content = fullContent;
                this._view.webview.postMessage({ type: 'updateMessage', id: assistantId, content: marker });
              }
            }
            break;
          case 'full_prompt':
            if (this._sessionManager && event.data) {
              this._sessionManager.logFullPrompt(event.data);
            }
            break;
          case 'usage':
            lastUsage = event.data;
            if (this._sessionManager) {
              this._sessionManager.logUsage(model, event.data);
            }
            break;
          case 'tool_started': {
            const marker = `\n<tool_call name="${event.name}" id="${event.call_id}">\n${JSON.stringify(event.parameters, null, 2)}\n</tool_call>\n`;
            fullContent += marker;
            if (this._ongoingMessage) this._ongoingMessage.content = fullContent;
            this._view.webview.postMessage({ type: 'updateMessage', id: assistantId, content: marker });
            break;
          }
          case 'tool_finished': {
            const toolResult = typeof event.result === 'string' ? event.result : JSON.stringify(event.result, null, 2);
            
            // Truncate for UI if too large
            const uiResult = toolResult.length > 50000 
              ? `${toolResult.substring(0, 50000)}\n\n... [TRUNCATED IN UI FOR PERFORMANCE. FULL LOG IN .mosaic/logs/tools.jsonl] ...`
              : toolResult;

            const marker = `\n<tool_response id="${event.call_id}">\n${uiResult}\n</tool_response>\n`;
            fullContent += marker;
            if (this._ongoingMessage) this._ongoingMessage.content = fullContent;
            this._view.webview.postMessage({ type: 'updateMessage', id: assistantId, content: marker });
            
            if (this._sessionManager) {
              this._sessionManager.logTool({
                name: event.name || 'unknown',
                arguments: event.parameters, // these are the original arguments from tool_started
                result: toolResult,
                duration: event.parameters?.duration,
                call_id: event.call_id
              });
            }

            if (['create_todo', 'update_todo', 'delete_todo'].includes(event.name || '')) {
              this._handleListTodos();
            }
            break;
          }
          case 'final_answer': {
            const endTime = Date.now();
            const ttft = firstTokenTime ? (firstTokenTime - startTime) : 0;
            const duration = firstTokenTime ? (endTime - firstTokenTime) : (endTime - startTime);
            const outputTokens = lastUsage?.completion_tokens || 0;
            const tps = duration > 0 ? (outputTokens / (duration / 1000)) : 0;

            const metadata = {
              model,
              ttft,
              tps: tps.toFixed(1),
              inputTokens: lastUsage?.prompt_tokens || 0,
              outputTokens: outputTokens,
              modifiedFiles: event.parameters?.modifiedFiles || []
            };

            this._view.webview.postMessage({ 
              type: 'generationMetadata', 
              id: assistantId,
              metadata: metadata
            });

            if (this._sessionManager && fullContent) {
              this._sessionManager.addMessage('assistant', fullContent, metadata, assistantId);
            }
            
            this._view.webview.postMessage({ type: 'generationFinished' });
            this._ongoingMessage = undefined;
            break;
          }
          case 'error':
            this._view.webview.postMessage({ type: 'addMessage', role: 'system', content: `❌ Agent Error: ${event.message}` });
            if (this._sessionManager) {
              this._sessionManager.addMessage('assistant', `❌ Error: ${event.message}`);
            }
            this._view.webview.postMessage({ type: 'generationFinished' });
            this._ongoingMessage = undefined;
            break;
        }
      });
    } catch (e: any) {
      this._view?.webview.postMessage({ type: 'addMessage', role: 'system', content: `❌ Error: ${e.message}` });
    } finally {
      this._view?.webview.postMessage({ type: 'generationFinished' });
      this._ongoingMessage = undefined;
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
