import * as vscode from 'vscode';
import { Agent, StreamEvent } from '../core/agent';
import * as fs from 'fs';
import * as path from 'path';
import { SessionManager } from '../core/session';
import { LMStudioProvider, OpenRouterProvider } from '../framework/llm/provider';
import { ReadFileTool, WriteFileTool, EditFileTool, ListDirectoryTool } from '../core/tools/fileTools';
import { RunCommandTool } from '../core/tools/runCommand';
import { CreateTodoTool, UpdateTodoTool, ListTodosTool, DeleteTodoTool, TodoManager } from '../core/tools/todoTools';

export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'mosaic.chatView';
  private _view?: vscode.WebviewView;
  private _activeAgent?: Agent;
  private _sessionManager?: SessionManager;

  constructor(private readonly _context: vscode.ExtensionContext) { }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    console.log('[Mosaic DEBUG] Resolving webview view...');
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._context.extensionUri]
    };

    const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (workspacePath) {
      const mosaicDir = path.join(workspacePath, '.mosaic');
      const chatsDir = path.join(mosaicDir, 'chats');
      const logsDir = path.join(mosaicDir, 'logs');
      [mosaicDir, chatsDir, logsDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      });
      console.log(`[Mosaic DEBUG] Workspace initialized at ${mosaicDir}`);
    }

    try {
      console.log('[Mosaic DEBUG] Initial refreshing...');
      this.refresh();
    } catch (e) {
      console.error('[Mosaic DEBUG] Error during initial refresh:', e);
    }

    webviewView.webview.onDidReceiveMessage(async (data) => {
      console.warn(data)
      console.log(`[Mosaic DEBUG] Received message: ${data.type}`);
      try {
        switch (data.type) {
          case 'sendMessage':
            await this._handleSendMessage(data.value);
            break;
          case 'stopGeneration':
            this._handleStopGeneration();
            break;
          case 'setProvider':
            console.log(`[Mosaic DEBUG] Setting provider to: ${data.value}`);
            await this._context.globalState.update('mosaic.provider', data.value);
            this.refresh(); // Always refresh to ensure we switch screens if needed
            break;
          case 'setModel':
            console.log(`[Mosaic DEBUG] Setting model to: ${data.value}`);
            await this._context.globalState.update('mosaic.model', data.value);
            break;
          case 'setApiKey':
            console.log(`[Mosaic DEBUG] API Key received`);
            await this._context.globalState.update('mosaic.openrouterApiKey', data.value);
            this.refresh(); // Refresh to switch to chat if setup is now complete
            break;
          case 'fetchModels':
            await this._handleFetchModels();
            break;
          case 'findFiles':
            await this._handleFindFiles(data.value);
            break;
          case 'listChats':
            await this._handleListChats();
            break;
          case 'loadChat':
            await this._handleLoadChat(data.value);
            break;
          case 'listTodos':
            await this._handleListTodos();
            break;
          case 'webviewError':
            console.error(`[Mosaic WEBVIEW ERROR] ${data.message}`, data.stack);
            break;
        }
      } catch (e) {
        console.error(`[Mosaic DEBUG] Error handling message ${data.type}:`, e);
      }
    });
  }

  public refresh() {
    if (this._view) {
      const provider = this._context.globalState.get<string>('mosaic.provider');
      const apiKey = this._context.globalState.get<string>('mosaic.openrouterApiKey') || '';
      const model = this._context.globalState.get<string>('mosaic.model') || '';
      const workspaceOpen = vscode.workspace.workspaceFolders !== undefined && vscode.workspace.workspaceFolders.length > 0;
      const setupRequired = !provider || (!apiKey && provider === 'openrouter');

      console.log(`[Mosaic DEBUG] Updating webview html (Workspace: ${workspaceOpen})...`);
      this._view.webview.html = this._getHtmlForWebview(this._view.webview, setupRequired, provider, apiKey, model);

      if (!workspaceOpen && !setupRequired) {
        this._view.webview.postMessage({ type: 'addSystemMessage', content: '⚠️ No workspace folder open. Some features may be limited.' });
      }
      console.log('[Mosaic DEBUG] Webview html updated.');
    }
  }

  public resetChat() {
    this._sessionManager = undefined;
    this.refresh();
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

    // Tell webview we are loading
    this._view.webview.postMessage({ type: 'setAvailableModels', models: [], loading: true });

    const providerType = this._context.globalState.get<string>('mosaic.provider') || 'openrouter';
    const apiKey = this._context.globalState.get<string>('mosaic.openrouterApiKey') || '';

    let llmProvider;
    if (providerType === 'lmstudio') {
      llmProvider = new LMStudioProvider();
    } else {
      llmProvider = new OpenRouterProvider(apiKey);
    }

    try {
      const models = await llmProvider.fetchModels();

      // If current model is not in the list and list is not empty, auto-select first one
      let currentModel = this._context.globalState.get<string>('mosaic.model');
      if (models.length > 0 && (!currentModel || !models.includes(currentModel))) {
        await this._context.globalState.update('mosaic.model', models[0]);
        currentModel = models[0];
      }

      this._view.webview.postMessage({
        type: 'setAvailableModels',
        models: models,
        currentModel: currentModel
      });
    } catch (e) {
      this._view.webview.postMessage({ type: 'setAvailableModels', models: [], error: true });
    }
  }

  private async _handleFindFiles(query: string) {
    if (!this._view) return;
    try {
      const files = await vscode.workspace.findFiles(`**/*${query}*`, '**/node_modules/**', 10);
      const relativeFiles = files.map(f => vscode.workspace.asRelativePath(f));
      this._view.webview.postMessage({ type: 'fileSuggestions', files: relativeFiles });
    } catch (e) {
      this._view.webview.postMessage({ type: 'fileSuggestions', files: [] });
    }
  }

  private async _handleListChats() {
    if (!this._view) return;
    const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';
    const chatDir = path.join(workspacePath, '.mosaic', 'chats');

    if (!fs.existsSync(chatDir)) {
      this._view.webview.postMessage({ type: 'chatList', chats: [] });
      return;
    }

    try {
      const files = fs.readdirSync(chatDir)
        .filter(f => f.endsWith('.json'))
        .map(f => {
          const content = fs.readFileSync(path.join(chatDir, f), 'utf-8');
          const sess = JSON.parse(content);
          return { id: f, name: sess.title || f.replace('chat_', '').replace('.json', '') };
        })
        .sort((a, b) => b.id.localeCompare(a.id));
      this._view.webview.postMessage({ type: 'chatList', chats: files });
    } catch (e) {
      this._view.webview.postMessage({ type: 'chatList', chats: [] });
    }
  }

  private async _handleLoadChat(chatId: string) {
    if (!this._view) return;
    const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';
    const chatFile = path.join(workspacePath, '.mosaic', 'chats', chatId);

    try {
      const content = fs.readFileSync(chatFile, 'utf-8');
      const session = JSON.parse(content);

      // Clear current state and load
      this._sessionManager = undefined; // Will be re-init if needed, or we could restore id

      this._view.webview.postMessage({ type: 'clearMessages' });
      this._view.webview.postMessage({ type: 'setTitle', title: session.title || 'Untitled' });
      for (const msg of session.history) {
        this._view.webview.postMessage({ type: 'addMessage', role: msg.role, content: msg.content });
      }
      this._view.webview.postMessage({ type: 'addSystemMessage', content: `Loaded chat: ${chatId}` });
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

    let llmProvider;
    if (providerType === 'lmstudio') {
      llmProvider = new LMStudioProvider();
    } else {
      llmProvider = new OpenRouterProvider(apiKey);
    }

    const tools = [
      new ReadFileTool(),
      new WriteFileTool(),
      new EditFileTool(),
      new ListDirectoryTool(),
      new RunCommandTool(),
      new CreateTodoTool(),
      new UpdateTodoTool(),
      new ListTodosTool(),
      new DeleteTodoTool()
    ];

    const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';
    if (!this._sessionManager && workspacePath) {
      this._sessionManager = new SessionManager(workspacePath);
      this._sessionManager.log('system', `Starting session with model: ${model}`);
    }

    if (this._sessionManager) {
      this._sessionManager.addMessage('user', text);

      const history = (this._sessionManager as any).history;
      if (history.length === 2) {
        this._generateTitle(text).then(title => {
          if (title && this._view) {
            this._view.webview.postMessage({ type: 'setTitle', title });
          }
        });
      }
    }

    this._activeAgent = new Agent(llmProvider, model, workspacePath, "User", tools);

    this._view.webview.postMessage({ type: 'addMessage', role: 'user', content: text });

    const currentAssistantMessageId = `msg-${Date.now()}`;
    let fullAssistantContent = '';
    this._view.webview.postMessage({ type: 'addMessage', role: 'assistant', content: '', id: currentAssistantMessageId });

    try {
      await this._activeAgent.run(text, async (event: StreamEvent) => {
        if (!this._view) return;

        switch (event.type) {
          case 'token':
            fullAssistantContent += event.data;
            this._view.webview.postMessage({ type: 'updateMessage', id: currentAssistantMessageId, content: event.data });
            break;
          case 'tool_started': {
            const startMarker = `\n<tool_call name="${event.name}" id="${event.call_id}">\n${JSON.stringify(event.parameters, null, 2)}\n</tool_call>\n`;
            fullAssistantContent += startMarker;
            this._view.webview.postMessage({ type: 'updateMessage', id: currentAssistantMessageId, content: startMarker });
            break;
          }
          case 'tool_finished': {
            const endMarker = `\n<tool_result id="${event.call_id}">\n${typeof event.result === 'string' ? event.result : JSON.stringify(event.result, null, 2)}\n</tool_result>\n`;
            fullAssistantContent += endMarker;
            this._view.webview.postMessage({ type: 'updateMessage', id: currentAssistantMessageId, content: endMarker });
            break;
          }
          case 'error':
            if (this._sessionManager) this._sessionManager.log('error', event.message || 'Unknown error');
            this._view.webview.postMessage({ type: 'addMessage', role: 'system', content: `❌ Error: ${event.message}` });
            break;
          case 'final_answer':
            this._view.webview.postMessage({ type: 'generationFinished' });
            this._activeAgent = undefined;
            break;
        }
      });
    } catch (e: any) {
      if (this._view) {
        this._view.webview.postMessage({ type: 'addMessage', role: 'system', content: `❌ Critical Error: ${e.message}` });
      }
    } finally {
      if (this._sessionManager && fullAssistantContent) {
        this._sessionManager.addMessage('assistant', fullAssistantContent);
      }

      // Ensure we send finished even if loop ends normally or crashed
      if (this._view) {
        this._view.webview.postMessage({ type: 'generationFinished' });
      }
      this._activeAgent = undefined;
    }
  }

  private async _generateTitle(userText: string) {
    const provider = this._context.globalState.get<string>('mosaic.provider');
    const model = this._context.globalState.get<string>('mosaic.model') || '';
    let providerInstance;
    if (provider === 'openrouter') {
      providerInstance = new OpenRouterProvider(this._context.globalState.get<string>('mosaic.openrouterApiKey') || '');
    } else {
      providerInstance = new LMStudioProvider();
    }

    try {
      const prompt = `Summarize this user request in exactly 3-5 words for a chat title: "${userText}". Return ONLY the title, no quotes or punctuation.`;
      let title = "";
      for await (const event of providerInstance.streamChat(model, [{ role: 'user', content: prompt }])) {
        if (event.type === 'token') title += event.data;
      }
      if (title && this._sessionManager) {
        this._sessionManager.setTitle(title.trim());
      }
      return "New Chat";
    }

  private _getHtmlForWebview(webview: vscode.Webview, setupRequired: boolean, provider?: string, apiKey?: string, currentModel?: string) {
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'src', 'webview', 'chat.css'));
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; script-src ${webview.cspSource} 'nonce-${nonce}' https://cdn.jsdelivr.net; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource};">
    <link href="${styleUri}" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js" nonce="${nonce}"></script>
    <title>Mosaic Chat</title>
</head>
<body>
    <div id="chat-container">
        ${setupRequired ? this._renderSetupScreen(provider, apiKey) : this._renderChatScreen(provider, currentModel)}
    </div>
    <script nonce="${nonce}">
        (function() {
            const vscode = acquireVsCodeApi();
            
            function log(msg, stack) {
                vscode.postMessage({ type: 'webviewError', message: msg, stack: stack || '' });
            }

            window.onerror = function(msg, url, line, col, error) {
                log("Fatal Error: " + msg + " at " + line + ":" + col, error ? error.stack : '');
                return false;
            };

            class MosaicUI {
                constructor() {
                    this.messagesContainer = document.getElementById('messages');
                    this.chatInput = document.getElementById('chat-input');
                    this.actionButton = document.getElementById('action-button');
                    this.providerSelect = document.getElementById('provider-select');
                    this.modelSelect = document.getElementById('model-select');
                    this.autocompleteList = document.getElementById('autocomplete-list');
                    
                    this.historyModal = document.getElementById('history-modal');
                    this.tasksModal = document.getElementById('tasks-modal');
                    
                    this.currentModel = "${currentModel || ''}";
                    this.isGenerating = false;
                    this.assistantMessages = {};
                    this.init();
                }

                init() {
                    // Send/Stop button
                    if (this.actionButton) {
                        this.actionButton.onclick = () => this.handleAction();
                    }

                    // Input shortcuts & auto-resize
                    if (this.chatInput) {
                        this.chatInput.onkeydown = (e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                this.handleAction();
                            }
                        };
                        this.chatInput.oninput = () => {
                            this.chatInput.style.height = 'auto';
                            this.chatInput.style.height = this.chatInput.scrollHeight + 'px';
                        };
                    }

                    // Setup screen logic
                    const setupProvider = document.getElementById('setup-provider');
                    const apikeyGroup = document.getElementById('apikey-group');
                    const saveSetupBtn = document.getElementById('save-setup-btn');

                    if (setupProvider && apikeyGroup) {
                        setupProvider.onchange = (e) => {
                           apikeyGroup.style.display = e.target.value === 'lmstudio' ? 'none' : 'block';
                        };
                    }

                    if (saveSetupBtn) {
                        saveSetupBtn.onclick = () => {
                            const p = document.getElementById('setup-provider').value;
                            const k = document.getElementById('setup-apikey').value;
                            vscode.postMessage({ type: 'setProvider', value: p });
                            if (k) vscode.postMessage({ type: 'setApiKey', value: k });
                        };
                    }

                    // Chat buttons
                    const historyBtn = document.getElementById('history-btn');
                    if (historyBtn) historyBtn.onclick = () => {
                        this.tasksModal.style.display = 'none';
                        this.historyModal.style.display = this.historyModal.style.display === 'block' ? 'none' : 'block';
                        if (this.historyModal.style.display === 'block') vscode.postMessage({ type: 'listChats' });
                    };

                    const tasksBtn = document.getElementById('tasks-btn');
                    if (tasksBtn) tasksBtn.onclick = () => {
                        this.historyModal.style.display = 'none';
                        this.tasksModal.style.display = this.tasksModal.style.display === 'block' ? 'none' : 'block';
                        if (this.tasksModal.style.display === 'block') vscode.postMessage({ type: 'listTodos' });
                    };

                    // Settings changes
                    if (this.providerSelect) {
                        this.providerSelect.onchange = (e) => vscode.postMessage({ type: 'setProvider', value: e.target.value });
                    }
                    if (this.modelSelect) {
                        this.modelSelect.onchange = (e) => vscode.postMessage({ type: 'setModel', value: e.target.value });
                    }

                    // Message bridge
                    window.addEventListener('message', event => this.handleMessage(event.data));
                    
                    // Initial load
                    if (this.modelSelect) vscode.postMessage({ type: 'fetchModels' });
                    
                    log("Mosaic UI Ready");
                }

                handleAction() {
                    if (this.isGenerating) {
                        vscode.postMessage({ type: 'stopGeneration' });
                    } else {
                        const text = this.chatInput ? this.chatInput.value.trim() : "";
                        if (text) {
                            this.setGenerating(true);
                            vscode.postMessage({ type: 'sendMessage', value: text });
                            this.chatInput.value = '';
                            this.chatInput.style.height = 'auto';
                        }
                    }
                }

                setGenerating(val) {
                    this.isGenerating = val;
                    if (!this.actionButton) return;
                    this.actionButton.classList.toggle('generating', val);
                    this.actionButton.innerHTML = val ? '<span class="stop-icon"></span>' : '<span class="send-icon"></span>';
                }

                handleMessage(msg) {
                    switch (msg.type) {
                        case 'addMessage': this.addMessage(msg); break;
                        case 'updateMessage': this.updateMessage(msg); break;
                        case 'generationFinished': this.setGenerating(false); break;
                        case 'setAvailableModels': this.updateModels(msg); break;
                        case 'chatList': this.updateChatList(msg.chats); break;
                        case 'todoList': this.updateTodoList(msg.todos); break;
                        case 'addSystemMessage': this.addSystemMessage(msg.content); break;
                    }
                }

                addMessage(msg) {
                    const div = document.createElement('div');
                    div.className = 'message ' + msg.role;
                    if (msg.id) {
                        div.id = msg.id;
                        this.assistantMessages[msg.id] = msg.content;
                    }
                    div.innerHTML = this.renderMarkdown(msg.content || '');
                    this.messagesContainer.appendChild(div);
                    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
                }

                updateMessage(msg) {
                    const el = document.getElementById(msg.id);
                    if (el) {
                        this.assistantMessages[msg.id] += msg.content;
                        el.innerHTML = this.renderMarkdown(this.assistantMessages[msg.id]);
                        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
                    }
                }

                renderMarkdown(text) {
                    if (typeof marked === 'undefined') return text.replace(/\\n/g, '<br>');
                    // Simple cleaning for tool calls to avoid parsing issues
                    let clean = text.replace(/<thought>[\\s\\S]*?<\\/thought>/g, '');
                    return marked.parse(clean);
                }

                updateModels(msg) {
                    if (!this.modelSelect) return;
                    this.modelSelect.innerHTML = msg.loading ? '<option>Loading...</option>' : 
                        (msg.models.length ? msg.models.map(m => \`<option value="\${m}" \${m === this.currentModel ? 'selected' : ''}>\${m}</option>\`).join('') : '<option>No models found</option>');
                }

                updateChatList(chats) {
                    const list = document.getElementById('history-list');
                    if (list) list.innerHTML = chats.map(c => \`<div class="history-item" onclick="vscode.postMessage({type:'loadChat', value:'\${c.id}'})">\${c.name}</div>\`).join('');
                }

                updateTodoList(todos) {
                    const list = document.getElementById('tasks-list');
                    if (list) list.innerHTML = todos.length ? todos.map(t => \`<div class="history-item task-item \${t.status}">\${t.title}</div>\`).join('') : '<div class="history-item">No tasks</div>';
                }

                addSystemMessage(content) {
                    const div = document.createElement('div');
                    div.className = 'message system';
                    div.textContent = content;
                    this.messagesContainer.appendChild(div);
                }
            }

            const ui = new MosaicUI();
        })();
    </script>
</body>
</html>`;
  }

  private _renderSetupScreen(provider?: string, apiKey?: string) {
    return `
      <div id="setup-screen">
          <h1>Welcome to Mosaic</h1>
          <p>Configure your AI provider to start chatting.</p>
          <div class="setup-group">
              <label>Provider</label>
              <select id="setup-provider">
                  <option value="openrouter" ${provider === 'openrouter' ? 'selected' : ''}>OpenRouter</option>
                  <option value="lmstudio" ${provider === 'lmstudio' ? 'selected' : ''}>LM Studio (Local)</option>
              </select>
          </div>
          <div class="setup-group" id="apikey-group" style="${provider === 'lmstudio' ? 'display:none;' : ''}">
              <label>API Key</label>
              <input type="password" id="setup-apikey" value="${apiKey || ''}" placeholder="sk-or-v1-..." />
          </div>
          <button id="save-setup-btn">Save & Continue</button>
      </div>`;
  }

  private _renderChatScreen(provider?: string, currentModel?: string) {
    return `
      <div id="chat-header">
          <span id="active-chat-title">New Chat</span>
      </div>
      <div id="messages"></div>
      
      <div id="history-modal" class="history-modal">
          <div class="history-content">
              <div class="history-header">
                <span>History</span>
                <button onclick="document.getElementById('history-modal').style.display='none'">✕</button>
              </div>
              <div id="history-list"></div>
          </div>
      </div>

      <div id="tasks-modal" class="history-modal">
          <div class="history-content">
              <div class="history-header">
                <span>Active Tasks</span>
                <button onclick="document.getElementById('tasks-modal').style.display='none'">✕</button>
              </div>
              <div id="tasks-list"></div>
          </div>
      </div>

      <div id="input-container">
          <div class="input-wrapper">
              <textarea id="chat-input" placeholder="Ask Mosaic..." rows="1"></textarea>
              <button id="action-button" title="Send message"><span class="send-icon"></span></button>
          </div>
      </div>
      <div id="settings-bar">
          <div style="display:flex; gap:4px;">
              <button id="history-btn" title="Recent Chats">🕒</button>
              <button id="tasks-btn" title="Project Tasks">📋</button>
          </div>
          <select id="provider-select">
              <option value="openrouter" ${provider === 'openrouter' ? 'selected' : ''}>OpenRouter</option>
              <option value="lmstudio" ${provider === 'lmstudio' ? 'selected' : ''}>LM Studio</option>
          </select>
          <select id="model-select"></select>
      </div>`;
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
