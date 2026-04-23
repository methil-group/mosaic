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

  constructor(private readonly _context: vscode.ExtensionContext) {}

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

    try {
      console.log('[Mosaic DEBUG] Initial refreshing...');
      this.refresh();
    } catch (e) {
      console.error('[Mosaic DEBUG] Error during initial refresh:', e);
    }

    webviewView.webview.onDidReceiveMessage(async (data) => {
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
            await this._context.globalState.update('mosaic.provider', data.value);
            // Only refresh if we might need to toggle between setup and chat screens
            const currentProvider = this._context.globalState.get<string>('mosaic.provider');
            const currentApiKey = this._context.globalState.get<string>('mosaic.openrouterApiKey') || '';
            const setupRequired = !currentProvider || (!currentApiKey && currentProvider === 'openrouter');
            
            if (setupRequired) {
              this.refresh();
            } else {
              // Otherwise just update models for the new provider
              await this._handleFetchModels();
            }
            break;
          case 'setModel':
            await this._context.globalState.update('mosaic.model', data.value);
            // No refresh needed for model change, it's just a state update
            break;
          case 'setApiKey':
            await this._context.globalState.update('mosaic.openrouterApiKey', data.value);
            const apiKeyProvider = this._context.globalState.get<string>('mosaic.provider');
            if (apiKeyProvider === 'openrouter') {
               // If we were in setup, this might fulfill requirements
               const setupReq = !data.value;
               if (setupReq) this.refresh();
               else await this._handleFetchModels();
            }
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
      return title.trim();
    } catch (e) {}
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
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <title>Mosaic Chat</title>
</head>
<body>
    <div id="chat-container">
        ${setupRequired ? this._renderSetupScreen(provider, apiKey) : this._renderChatScreen(provider, currentModel)}
    </div>
    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        vscode.postMessage({ type: 'webviewError', message: '[DEBUG] Webview script starting...' });

        window.onerror = function(msg, url, line, col, error) {
            const errorMsg = "Webview Error: " + msg + " at " + line + ":" + col;
            vscode.postMessage({ type: 'webviewError', message: errorMsg, stack: error ? error.stack : '' });
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
                this.historyList = document.getElementById('history-list');
                this.historyBtn = document.getElementById('history-btn');
                this.tasksModal = document.getElementById('tasks-modal');
                this.tasksList = document.getElementById('tasks-list');
                this.tasksBtn = document.getElementById('tasks-btn');
                this.isGenerating = false;
                this.assistantMessages = {};
                this.currentModel = "${currentModel || ''}";
                this.tokenCount = 0;
                this.startTime = 0;

                try {
                    this.init();
                } catch (e) {
                    vscode.postMessage({ type: 'webviewError', message: "UI Init Crash: " + e.message, stack: e.stack });
                }
            }

            init() {
                console.log("MosaicUI: Initializing...");
                if (this.actionButton) {
                    this.actionButton.addEventListener('click', (e) => {
                        console.log("MosaicUI: Action button clicked");
                        this.handleAction();
                    });
                }

                if (this.chatInput) {
                    this.chatInput.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            if (this.autocompleteList && this.autocompleteList.style.display === 'block') {
                                const selected = this.autocompleteList.querySelector('.selected');
                                if (selected) {
                                    this.applyAutocomplete(selected.textContent);
                                    e.preventDefault();
                                    return;
                                }
                            }
                            console.log("MosaicUI: Enter pressed");
                            e.preventDefault();
                            this.handleAction();
                        }
                        if (e.key === 'Escape') {
                            this.hideAutocomplete();
                        }
                    });
                    this.chatInput.addEventListener('input', (e) => {
                        this.resizeInput();
                        this.handleInputForAutocomplete(e);
                    });
                }

                if (this.historyBtn) {
                    this.historyBtn.onclick = () => this.toggleHistory();
                }

                if (this.tasksBtn) {
                    this.tasksBtn.onclick = () => this.toggleTasks();
                }

                if (this.providerSelect && this.modelSelect) {
                    vscode.postMessage({ type: 'fetchModels' });
                    
                    this.providerSelect.addEventListener('change', (e) => {
                        const newVal = e.target.value;
                        console.log("MosaicUI: Provider changed to", newVal);
                        vscode.postMessage({ type: 'setProvider', value: newVal });
                    });
                    
                    this.modelSelect.addEventListener('change', (e) => {
                        const newVal = e.target.value;
                        if (newVal && newVal !== this.currentModel) {
                            console.log("MosaicUI: Model changed to", newVal);
                            this.currentModel = newVal;
                            vscode.postMessage({ type: 'setModel', value: newVal });
                        }
                    });
                }

                window.addEventListener('message', event => {
                    console.log("MosaicUI: Received message", event.data.type);
                    this.handleMessage(event.data);
                });

                // Setup specific
                const saveBtn = document.getElementById('save-setup-btn');
                if (saveBtn) {
                    saveBtn.addEventListener('click', () => {
                        const pEl = document.getElementById('setup-provider');
                        const kEl = document.getElementById('setup-apikey');
                        if (pEl) {
                            const p = pEl.value;
                            vscode.postMessage({ type: 'setProvider', value: p });
                            if (p === 'openrouter' && kEl && kEl.value) {
                                vscode.postMessage({ type: 'setApiKey', value: kEl.value });
                            }
                        }
                    });
                }
                
                console.log("MosaicUI: Initialization finished.");
                vscode.postMessage({ type: 'webviewError', message: '[DEBUG] Initialization finished successfully.' });
            }

            handleAction() {
                console.log("MosaicUI: handleAction called", { isGenerating: this.isGenerating });
                if (this.isGenerating) {
                    vscode.postMessage({ type: 'stopGeneration' });
                } else {
                    const text = this.chatInput ? this.chatInput.value.trim() : "";
                    console.log("MosaicUI: Message text length:", text.length);
                    if (text) {
                        this.setGenerating(true);
                        this.tokenCount = 0;
                        this.startTime = Date.now();
                        vscode.postMessage({ type: 'sendMessage', value: text });
                        this.chatInput.value = '';
                        this.hideAutocomplete();
                        this.resizeInput();
                    }
                }
            }

            handleInputForAutocomplete(e) {
                const text = this.chatInput.value;
                const cursorPos = this.chatInput.selectionStart;
                const textBefore = text.substring(0, cursorPos);
                const match = textBefore.match(/@(\\w*)$/);

                if (match) {
                    const query = match[1];
                    vscode.postMessage({ type: 'findFiles', value: query });
                } else {
                    this.hideAutocomplete();
                }
            }

            handleNavAutocomplete(key) {
                const items = Array.from(this.autocompleteList.querySelectorAll('.autocomplete-item'));
                const selectedIndex = items.findIndex(i => i.classList.contains('selected'));
                let nextIndex = selectedIndex;

                if (key === 'ArrowDown') nextIndex = (selectedIndex + 1) % items.length;
                else if (key === 'ArrowUp') nextIndex = (selectedIndex - 1 + items.length) % items.length;

                items.forEach((item, idx) => {
                    item.classList.toggle('selected', idx === nextIndex);
                });
            }

            applyAutocomplete(fileName) {
                const text = this.chatInput.value;
                const cursorPos = this.chatInput.selectionStart;
                const textBefore = text.substring(0, cursorPos);
                const textAfter = text.substring(cursorPos);
                const match = textBefore.match(/@(\\w*)$/);

                if (match) {
                    const newTextBefore = textBefore.substring(0, match.index) + fileName + ' ';
                    this.chatInput.value = newTextBefore + textAfter;
                    this.chatInput.selectionStart = this.chatInput.selectionEnd = newTextBefore.length;
                    this.hideAutocomplete();
                }
            }

            hideAutocomplete() {
                if (this.autocompleteList) {
                    this.autocompleteList.style.display = 'none';
                }
            }

            setGenerating(val) {
                this.isGenerating = val;
                if (!this.actionButton) return;
                
                if (val) {
                    this.actionButton.innerHTML = '<span class="stop-icon"></span>';
                    this.actionButton.classList.add('generating');
                } else {
                    this.actionButton.innerHTML = '<span class="send-icon"></span>';
                    this.actionButton.classList.remove('generating');
                }
            }

            handleMessage(message) {
                switch (message.type) {
                    case 'setAvailableModels':
                        this.updateModels(message.models, message.loading, message.currentModel);
                        break;
                    case 'addMessage':
                        this.addMessage(message);
                        break;
                    case 'updateMessage':
                        this.updateMessage(message);
                        break;
                    case 'addSystemMessage':
                        this.addSystemMessage(message.content);
                        break;
                    case 'generationFinished':
                    case 'generationStopped':
                        this.setGenerating(false);
                        this.showSpeed(message.id || Object.keys(this.assistantMessages).pop());
                        break;
                    case 'fileSuggestions':
                        this.showFileSuggestions(message.files);
                        break;
                    case 'chatList':
                        this.showChatList(message.chats);
                        break;
                    case 'clearMessages':
                        this.messagesContainer.innerHTML = '';
                        this.assistantMessages = {};
                        break;
                    case 'setTitle':
                        const titleEl = document.getElementById('active-chat-title');
                        if (titleEl) titleEl.textContent = message.title;
                        break;
                    case 'todoList':
                        this.showTodoList(message.todos);
                        break;
                }
            }

            toggleHistory() {
                if (this.historyModal.style.display === 'block') {
                    this.historyModal.style.display = 'none';
                } else {
                    this.tasksModal.style.display = 'none';
                    vscode.postMessage({ type: 'listChats' });
                }
            }

            toggleTasks() {
                if (this.tasksModal.style.display === 'block') {
                    this.tasksModal.style.display = 'none';
                } else {
                    this.historyModal.style.display = 'none';
                    vscode.postMessage({ type: 'listTodos' });
                }
            }

            showTodoList(todos) {
                this.tasksList.innerHTML = '';
                if (todos.length === 0) {
                    this.tasksList.innerHTML = '<div class="history-item">No active tasks</div>';
                }
                todos.forEach(todo => {
                    const item = document.createElement('div');
                    item.className = 'history-item task-item ' + todo.status;
                    const statusIcon = todo.status === 'done' ? '✓' : (todo.status === 'in_progress' ? '●' : '○');
                    item.innerHTML = \`<span class="task-status">\${statusIcon}</span> \${todo.title}\`;
                    item.onclick = () => {
                        // Click to talk about it
                        this.chatInput.value = "About task [" + todo.id + "]: " + todo.title;
                        this.tasksModal.style.display = 'none';
                        this.chatInput.focus();
                    };
                    this.tasksList.appendChild(item);
                });
                this.tasksModal.style.display = 'block';
            }

            showChatList(chats) {
                this.historyList.innerHTML = '';
                
                // Add "New Chat" option
                const newChat = document.createElement('div');
                newChat.className = 'history-item new-chat';
                newChat.innerHTML = '<i>+</i> New Chat';
                newChat.onclick = () => {
                    vscode.postMessage({ type: 'sendMessage', value: '/reset' }); // Or just reset manually
                    document.getElementById('action-button').click(); // trigger reset if we had one
                    // Actually let's just clear UI
                    this.messagesContainer.innerHTML = '';
                    this.assistantMessages = {};
                    this.historyModal.style.display = 'none';
                    // Optional: tell backend to reset session
                    // vscode.postMessage({ type: 'resetSession' });
                };
                this.historyList.appendChild(newChat);

                chats.forEach(chat => {
                    const item = document.createElement('div');
                    item.className = 'history-item';
                    item.textContent = chat.name;
                    item.onclick = () => {
                        vscode.postMessage({ type: 'loadChat', value: chat.id });
                        this.historyModal.style.display = 'none';
                    };
                    this.historyList.appendChild(item);
                });
                this.historyModal.style.display = 'block';
            }

            showFileSuggestions(files) {
                if (files.length === 0) {
                    this.hideAutocomplete();
                    return;
                }
                this.autocompleteList.innerHTML = '';
                files.forEach((file, idx) => {
                    const item = document.createElement('div');
                    item.className = 'autocomplete-item' + (idx === 0 ? ' selected' : '');
                    item.innerHTML = \`<svg class="file-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg> \${file}\`;
                    item.onclick = () => this.applyAutocomplete(file);
                    this.autocompleteList.appendChild(item);
                });
                this.autocompleteList.style.display = 'block';
            }

            showSpeed(id) {
                const targetMsg = document.getElementById(id);
                if (targetMsg && this.tokenCount > 0) {
                  const duration = (Date.now() - this.startTime) / 1000;
                  const speed = (this.tokenCount / duration).toFixed(1);
                  const info = document.createElement('div');
                  info.className = 'generation-info';
                  info.textContent = speed + ' tokens/s';
                  targetMsg.appendChild(info);
                }
            }

            updateModels(models, isLoading, currentModel) {
                if (!this.modelSelect) return;
                
                if (currentModel) {
                    this.currentModel = currentModel;
                }

                this.modelSelect.innerHTML = '';
                
                if (isLoading) {
                    const opt = document.createElement('option');
                    opt.value = "";
                    opt.textContent = "Loading models...";
                    this.modelSelect.appendChild(opt);
                    return;
                }

                if (models.length === 0) {
                    const opt = document.createElement('option');
                    opt.value = "";
                    opt.textContent = "No models found";
                    this.modelSelect.appendChild(opt);
                } else {
                    models.forEach(m => {
                        const opt = document.createElement('option');
                        opt.value = m;
                        opt.textContent = m;
                        if (m === this.currentModel) opt.selected = true;
                        this.modelSelect.appendChild(opt);
                    });
                    
                    // If current model wasn't set or not in list, and we have models, 
                    // the browser will default to first one. Update our state to match.
                    if (!this.modelSelect.value && models.length > 0) {
                        this.currentModel = models[0];
                    }
                }
            }

            addMessage(message) {
                if (!this.messagesContainer) return;
                const msgDiv = document.createElement('div');
                msgDiv.className = 'message ' + message.role;
                if (message.id) {
                    msgDiv.id = message.id;
                    this.assistantMessages[message.id] = message.content;
                    msgDiv.innerHTML = this.formatMessage(message.content);
                    this.finalizeToolCalls(msgDiv);
                } else {
                    if (typeof marked === 'undefined') {
                        msgDiv.textContent = message.content || "";
                        vscode.postMessage({ type: 'webviewError', message: "marked library missing" });
                    } else {
                        msgDiv.innerHTML = marked.parse(message.content || "");
                    }
                }
                this.messagesContainer.appendChild(msgDiv);
                this.scrollToBottom();
            }

            updateMessage(message) {
                const targetMsg = document.getElementById(message.id);
                if (targetMsg) {
                    this.assistantMessages[message.id] += message.content;
                    this.tokenCount++;
                    targetMsg.innerHTML = this.formatMessage(this.assistantMessages[message.id]);
                    this.finalizeToolCalls(targetMsg);
                    this.scrollToBottom();
                }
            }

            addSystemMessage(content) {
                const sysDiv = document.createElement('div');
                sysDiv.className = 'message system';
                sysDiv.textContent = content;
                this.messagesContainer.appendChild(sysDiv);
                this.scrollToBottom();
            }

            formatMessage(content) {
                if (!content) return "";
                
                let thoughts = "";
                let cleaned = content;

                // 1. Extract closed thoughts
                cleaned = cleaned.replace(/<thought>([\s\S]*?)<\/thought>/g, (match, thought) => {
                    thoughts += thought.trim() + "\n";
                    return "";
                });

                // 2. Extract unclosed thought (for streaming)
                const openIdx = cleaned.indexOf('<thought>');
                if (openIdx !== -1) {
                    thoughts += cleaned.substring(openIdx + 9);
                    cleaned = cleaned.substring(0, openIdx);
                }
                
                // 3. Handle partial tool calls (streaming)
                cleaned = cleaned.replace(/<tool_call name="([^"]+)" id="([^"]+)">([\s\S]*?)$/, (match, name, id) => {
                    return '<div class="tool-call loading"><div class="tool-header loading">Running ' + name + '...</div></div>';
                });
                
                // 4. Handle completed tool calls
                let formatted = cleaned.replace(/<tool_call name="([^"]+)" id="([^"]+)">([\s\S]*?)<\/tool_call>/g, (match, name, id, args) => {
                    let summary = "";
                    try {
                        const parsed = JSON.parse(args.trim());
                        if (name === 'run_command') summary = ": " + parsed.command;
                        else if (name === 'create_todo') summary = ": " + parsed.title;
                        else if (parsed.path) summary = ": " + parsed.path;
                    } catch(e) {}
                    return '<div class="tool-call" id="call-' + id + '"><div class="tool-header loading" onclick="this.parentElement.classList.toggle(\'open\')">' + name.replace(/_/g, ' ') + summary + '</div><div class="tool-content">' + args.trim() + '</div></div>';
                });

                formatted = formatted.replace(/<tool_result id="([^"]+)">([\s\S]*?)<\/tool_result>/g, (match, id, result) => {
                    if (result.includes('### Current Tasks') || (result.includes('[') && result.includes(']'))) {
                        return '<div class="todo-inline-result">' + marked.parse(result) + '</div>';
                    }
                    return '<div class="tool-result-marker" data-id="' + id + '" style="display:none">' + result + '</div>';
                });

                if (typeof marked === 'undefined') {
                    vscode.postMessage({ type: 'webviewError', message: "marked library missing" });
                    return formatted; // Fallback to raw
                }
                let html = marked.parse(formatted);
                if (thoughts) {
                    const isOpen = thoughts.length > 0 ? ' open' : '';
                    const thoughtHtml = '<div class="thought-block' + isOpen + '">' +
                        '<div class="thought-header" onclick="this.parentElement.classList.toggle(\'open\')">' +
                            '<span class="thought-icon">💡</span> Thinking...' +
                        '</div>' +
                        '<div class="thought-content">' + marked.parse(thoughts) + '</div>' +
                    '</div>';
                    html = thoughtHtml + html;
                }
                return html;
            }

            finalizeToolCalls(container) {
                const results = container.querySelectorAll('.tool-result-marker');
                results.forEach(res => {
                    const id = res.getAttribute('data-id');
                    const callDiv = container.querySelector('#call-' + id);
                    if (callDiv) {
                        const header = callDiv.querySelector('.tool-header');
                        const content = callDiv.querySelector('.tool-content');
                        header.classList.remove('loading');
                        header.classList.add('done');
                        if (!content.innerHTML.includes('Output:')) {
                            content.innerHTML += "\\n\\n---\\nOutput:\\n" + res.innerText;
                        }
                    }
                    res.remove();
                });
            }

            resizeInput() {
                if (!this.chatInput) return;
                this.chatInput.style.height = 'auto';
                this.chatInput.style.height = (this.chatInput.scrollHeight) + 'px';
            }

            scrollToBottom() {
                if (this.messagesContainer) {
                    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
                }
            }
        }

        let mosaicInitialized = false;
        function initMosaic() {
            if (mosaicInitialized) return;
            mosaicInitialized = true;
            new MosaicUI();
        }

        window.addEventListener('DOMContentLoaded', initMosaic);
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            initMosaic();
        }
    </script>
</body>
</html>`;
  }

  private _renderSetupScreen(provider?: string, apiKey?: string) {
    return `
      <div id="setup-screen">
          <h1>Welcome to Mosaic</h1>
          <p>Please configure your AI provider.</p>
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
      
      <div id="history-modal">
          <div class="history-content">
              <div class="history-header">
                <span>History</span>
                <button onclick="document.getElementById('history-modal').style.display='none'" title="Close">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              <div id="history-list"></div>
          </div>
      </div>

      <div id="tasks-modal" class="history-modal">
          <div class="history-content">
              <div class="history-header">
                <span>Active Tasks</span>
                <button onclick="document.getElementById('tasks-modal').style.display='none'" title="Close">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              <div id="tasks-list"></div>
          </div>
      </div>

      <div id="input-container">
          <div class="input-wrapper">
              <div id="autocomplete-list"></div>
              <textarea id="chat-input" placeholder="Ask Mosaic..." rows="1"></textarea>
              <button id="action-button" title="Send message"><span class="send-icon"></span></button>
          </div>
      </div>
      <div id="settings-bar">
          <div style="display:flex; gap:0.2rem;">
              <button id="history-btn" title="Recent Chats">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </button>
              <button id="tasks-btn" title="Project Tasks">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
              </button>
          </div>
          <select id="provider-select">
              <option value="openrouter" ${provider === 'openrouter' ? 'selected' : ''}>OpenRouter</option>
              <option value="lmstudio" ${provider === 'lmstudio' ? 'selected' : ''}>LM Studio</option>
          </select>
          <select id="model-select" title="Choose Model">
              <option value="">Loading models...</option>
          </select>
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
