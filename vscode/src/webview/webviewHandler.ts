import * as vscode from 'vscode';

export class WebviewHandler {
    constructor(private readonly _extensionUri: vscode.Uri) {}

    public getHtmlForWebview(webview: vscode.Webview, setupRequired: boolean, provider?: string, apiKey?: string, currentModel?: string): string {
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'chat.css'));
        const nonce = this._getNonce();

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
            
            function log(msg, detail) {
                console.log("[Mosaic UI] " + msg, detail || '');
            }

            class MosaicUI {
                constructor() {
                    this.isGenerating = false;
                    this.assistantMessages = {};
                    this.currentModel = "${currentModel || ''}";
                    this.init();
                }

                init() {
                    log("Initializing Event Delegation...");
                    
                    document.addEventListener('click', (e) => {
                        const target = e.target.closest('button, .history-item, .tool-header, .thought-header');
                        if (!target) return;

                        if (target.id === 'action-button' || target.closest('#action-button')) {
                            this.handleAction();
                        } else if (target.id === 'save-setup-btn') {
                            this.handleSaveSetup();
                        } else if (target.id === 'history-btn') {
                            this.toggleModal('history-modal', 'listChats');
                        } else if (target.id === 'tasks-btn') {
                            this.toggleModal('tasks-modal', 'listTodos');
                        } else if (target.classList.contains('history-item') && !target.classList.contains('task-item')) {
                            const chatId = target.getAttribute('data-id');
                            if (chatId) {
                                log("Loading Chat:", chatId);
                                vscode.postMessage({ type: 'loadChat', value: chatId });
                                document.getElementById('history-modal').style.display = 'none';
                            }
                        } else if (target.classList.contains('tool-header') || target.classList.contains('thought-header')) {
                            target.parentElement.classList.toggle('open');
                        }
                    });

                    document.addEventListener('keydown', (e) => {
                        if (e.target.id === 'chat-input') {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                this.handleAction();
                            }
                        }
                    });

                    document.addEventListener('input', (e) => {
                        if (e.target.id === 'chat-input') {
                            const input = e.target;
                            input.style.height = 'auto';
                            input.style.height = input.scrollHeight + 'px';
                        }
                        if (e.target.id === 'setup-provider') {
                            const apikeyGroup = document.getElementById('apikey-group');
                            if (apikeyGroup) apikeyGroup.style.display = e.target.value === 'lmstudio' ? 'none' : 'block';
                        }
                    });

                    document.addEventListener('change', (e) => {
                        if (e.target.id === 'provider-select') {
                            vscode.postMessage({ type: 'setProvider', value: e.target.value });
                        } else if (e.target.id === 'model-select') {
                            vscode.postMessage({ type: 'setModel', value: e.target.value });
                        }
                    });

                    window.addEventListener('message', event => {
                        console.log("[Mosaic UI] 📥 Message from Extension:", event.data.type);
                        this.handleMessage(event.data);
                    });
                    
                    if (document.getElementById('model-select')) {
                        vscode.postMessage({ type: 'fetchModels' });
                    }
                    
                    log("Mosaic UI Ready");
                }

                handleAction() {
                    const input = document.getElementById('chat-input');
                    if (this.isGenerating) {
                        vscode.postMessage({ type: 'stopGeneration' });
                    } else {
                        const text = input ? input.value.trim() : "";
                        if (text) {
                            this.setGenerating(true);
                            vscode.postMessage({ type: 'sendMessage', value: text });
                            input.value = '';
                            input.style.height = 'auto';
                        }
                    }
                }

                handleSaveSetup() {
                    const pEl = document.getElementById('setup-provider');
                    const kEl = document.getElementById('setup-apikey');
                    if (pEl) {
                        const p = pEl.value;
                        const k = kEl ? kEl.value : "";
                        vscode.postMessage({ type: 'setProvider', value: p });
                        if (k) vscode.postMessage({ type: 'setApiKey', value: k });
                    }
                }

                toggleModal(id, fetchType) {
                    const modal = document.getElementById(id);
                    const isVisible = modal && modal.style.display === 'block';
                    
                    document.getElementById('history-modal').style.display = 'none';
                    document.getElementById('tasks-modal').style.display = 'none';
                    
                    if (modal && !isVisible) {
                        modal.style.display = 'block';
                        if (fetchType) vscode.postMessage({ type: fetchType });
                    }
                }

                setGenerating(val) {
                    this.isGenerating = val;
                    const btn = document.getElementById('action-button');
                    if (!btn) return;
                    btn.classList.toggle('generating', val);
                    btn.innerHTML = val ? '<span class="stop-icon"></span>' : '<span class="send-icon"></span>';
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
                        case 'clearMessages': 
                            const container = document.getElementById('messages');
                            if (container) container.innerHTML = ''; 
                            break;
                    }
                }

                renderMarkdown(text) {
                    if (!text) return "";
                    let thoughts = "";
                    let cleaned = text;

                    const thoughtRegex = new RegExp('<thought>([\\\\s\\\\S]*?)<\\\\/thought>', 'g');
                    cleaned = cleaned.replace(thoughtRegex, (match, thought) => {
                        thoughts += thought.trim() + "\\n";
                        return "";
                    });

                    const openIdx = cleaned.indexOf('<thought>');
                    if (openIdx !== -1) {
                        thoughts += cleaned.substring(openIdx + 9);
                        cleaned = cleaned.substring(0, openIdx);
                    }

                    const toolRegex = new RegExp('<tool_call name="([^"]+)" id="([^"]+)">([\\\\s\\\\S]*?)<\\\\/tool_call>', 'g');
                    let formatted = cleaned.replace(toolRegex, (match, name, id, args) => {
                        let summary = "";
                        try {
                            const parsed = JSON.parse(args.trim());
                            if (name === 'run_command') summary = ": " + (parsed.command || "");
                            else if (parsed.path) summary = ": " + parsed.path;
                            else if (parsed.title) summary = ": " + parsed.title;
                        } catch(e) {}
                        return \`<div class="tool-call" id="call-\${id}"><div class="tool-header loading">\${name.replace(/_/g, ' ')}\${summary}</div><div class="tool-content">\${args.trim()}</div></div>\`;
                    });

                    const ongoingToolRegex = new RegExp('<tool_call name="([^"]+)" id="([^"]+)">([\\\\s\\\\S]*?)$');
                    formatted = formatted.replace(ongoingToolRegex, (match, name) => {
                        return \`<div class="tool-call loading"><div class="tool-header loading">Running \${name.replace(/_/g, ' ')}...</div></div>\`;
                    });

                    const toolResultRegex = new RegExp('<tool_result id="([^"]+)">([\\\\s\\\\S]*?)<\\\\/tool_result>', 'g');
                    formatted = formatted.replace(toolResultRegex, (match, id, result) => {
                        return \`<div class="tool-result-marker" data-id="\${id}" style="display:none">\${result}</div>\`;
                    });

                    if (typeof marked === 'undefined') return formatted.replace(/\\n/g, '<br>');

                    let html = marked.parse(formatted);
                    if (thoughts) {
                        html = \`<div class="thought-block open"><div class="thought-header"><span class="thought-icon">💡</span> Thinking...</div><div class="thought-content">\${marked.parse(thoughts)}</div></div>\` + html;
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
                            if (header) {
                                header.classList.remove('loading');
                                header.classList.add('done');
                            }
                            if (content) {
                                let rawResult = res.innerText.trim();
                                let formattedResult = rawResult;
                                try {
                                    const parsed = JSON.parse(rawResult);
                                    if (Array.isArray(parsed) && parsed.length > 0 && (parsed[0].name || parsed[0].path)) {
                                        formattedResult = '<div class="file-grid">' + 
                                            parsed.map(f => \`<div class="file-badge \${f.type || 'file'}">\${f.type === 'directory' ? '📁' : '📄'} \${f.name || f.path || 'unknown'}</div>\`).join('') + '</div>';
                                    } else {
                                        formattedResult = '<pre><code>' + JSON.stringify(parsed, null, 2) + '</code></pre>';
                                    }
                                } catch(e) {
                                    if (rawResult.length > 500) formattedResult = '<pre><code>' + rawResult.substring(0, 500) + '...</code></pre>';
                                }
                                content.innerHTML = '<div class="tool-output-label">Output:</div>' + formattedResult;
                            }
                        }
                        res.remove();
                    });
                }

                addMessage(msg) {
                    const container = document.getElementById('messages');
                    if (!container) return;
                    const div = document.createElement('div');
                    div.className = 'message ' + msg.role;
                    if (msg.id) {
                        div.id = msg.id;
                        this.assistantMessages[msg.id] = msg.content;
                    }
                    div.innerHTML = this.renderMarkdown(msg.content || '');
                    this.finalizeToolCalls(div);
                    container.appendChild(div);
                    requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
                }

                updateMessage(msg) {
                    const el = document.getElementById(msg.id);
                    const container = document.getElementById('messages');
                    if (el) {
                        this.assistantMessages[msg.id] += msg.content;
                        el.innerHTML = this.renderMarkdown(this.assistantMessages[msg.id]);
                        this.finalizeToolCalls(el);
                        if (container) requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
                    }
                }

                updateModels(msg) {
                    const select = document.getElementById('model-select');
                    if (!select) return;
                    select.innerHTML = msg.loading ? '<option>Loading...</option>' : 
                        (msg.models.length ? msg.models.map(m => \`<option value="\${m}" \${m === this.currentModel ? 'selected' : ''}>\${m}</option>\`).join('') : '<option>No models found</option>');
                }

                updateChatList(chats) {
                    const list = document.getElementById('history-list');
                    if (list) list.innerHTML = chats.map(c => \`<div class="history-item" data-id="\${c.id}">\${c.name}</div>\`).join('');
                }

                updateTodoList(todos) {
                    const list = document.getElementById('tasks-list');
                    if (list) list.innerHTML = todos.length ? todos.map(t => \`<div class="history-item task-item \${t.status}">\${t.title}</div>\`).join('') : '<div class="history-item">No tasks</div>';
                }

                addSystemMessage(content) {
                    const container = document.getElementById('messages');
                    if (!container) return;
                    const div = document.createElement('div');
                    div.className = 'message system';
                    div.textContent = content;
                    container.appendChild(div);
                }
            }

            const ui = new MosaicUI();
        })();
    </script>
</body>
</html>`;
    }

    private _renderSetupScreen(provider?: string, apiKey?: string): string {
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

    private _renderChatScreen(provider?: string, currentModel?: string): string {
        return `
        <div id="chat-header">
            <span id="active-chat-title">New Chat</span>
        </div>
        <div id="messages"></div>
        
        <div id="history-modal" class="history-modal" style="display:none">
            <div class="history-content">
                <div class="history-header">
                  <span>History</span>
                  <button onclick="document.getElementById('history-modal').style.display='none'">✕</button>
                </div>
                <div id="history-list"></div>
            </div>
        </div>

        <div id="tasks-modal" class="history-modal" style="display:none">
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

    private _getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}
