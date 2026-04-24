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
                        } else if (target.id === 'history-btn' || target.closest('#history-btn')) {
                            this.toggleModal('history-modal', 'listChats');
                        } else if (target.id === 'new-chat-btn' || target.closest('#new-chat-btn')) {
                            vscode.postMessage({ type: 'resetChat' });
                        } else if (target.classList.contains('close-modal')) {
                            const modalId = target.getAttribute('data-modal');
                            if (modalId) document.getElementById(modalId).style.display = 'none';
                        } else if (target.classList.contains('history-item') && !target.classList.contains('task-item')) {
                            if (target.classList.contains('confirming')) return;
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
                        vscode.postMessage({ type: 'getHistory' });
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
                        case 'addMessage': this.addMessage(msg.role, msg.content, msg.id); break;
                        case 'updateMessage': this.updateMessage(msg); break;
                        case 'generationFinished': this.setGenerating(false); break;
                        case 'setAvailableModels': this.updateModels(msg); break;
                        case 'generationMetadata': this.addMessageMetadata(msg.id, msg.metadata); break;
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
                    
                    const blocks = [];
                    const blockRegex = /<(thought|tool_call|tool_result)[\s\S]*?(?:<\/\1>|$)/g;
                    
                    let lastIdx = 0;
                    let match;
                    while ((match = blockRegex.exec(text)) !== null) {
                        if (match.index > lastIdx) {
                            blocks.push({ type: 'text', content: text.substring(lastIdx, match.index) });
                        }
                        blocks.push({ type: 'block', content: match[0] });
                        lastIdx = blockRegex.lastIndex;
                    }
                    if (lastIdx < text.length) {
                        blocks.push({ type: 'text', content: text.substring(lastIdx) });
                    }

                    return blocks.map(b => {
                        if (b.type === 'text') {
                            return typeof marked !== 'undefined' ? marked.parse(b.content) : b.content.replace(/\n/g, '<br>');
                        } else {
                            let content = b.content;
                            
                            if (content.startsWith('<thought>')) {
                                const isClosed = content.includes('</thought>');
                                const thoughtText = isClosed ? (content.match(/<thought>([\s\S]*?)<\/thought>/)?.[1] || "") : content.substring(9);
                                return \`<div class="thought-block \${!isClosed ? 'open' : ''}"><div class="thought-header"><span class="thought-icon">💡</span> \${isClosed ? 'Thought' : 'Thinking...'}</div><div class="thought-content">\${typeof marked !== 'undefined' ? marked.parse(thoughtText.trim()) : thoughtText.trim()}</div></div>\`;
                            }
                            
                            if (content.startsWith('<tool_call')) {
                                const isClosed = content.includes('</tool_call>');
                                if (isClosed) {
                                    const m = content.match(/<tool_call name="([^"]+)" id="([^"]+)">([\s\S]*?)<\/tool_call>/);
                                    if (m) {
                                        const [_, name, id, args] = m;
                                        let summary = "";
                                        try {
                                            const parsed = JSON.parse(args.trim());
                                            if (name === 'run_command') summary = ": " + (parsed.command || "");
                                            else if (parsed.path) summary = ": " + parsed.path;
                                            else if (parsed.title) summary = ": " + parsed.title;
                                        } catch(e) {}
                                        return \`<div class="tool-call" id="call-\${id}"><div class="tool-header loading">\${name.replace(/_/g, ' ')}\${summary}</div><div class="tool-content">\${args.trim()}</div></div>\`;
                                    }
                                } else {
                                    const m = content.match(/<tool_call name="([^"]+)" id="([^"]+)">([\s\S]*?)$/);
                                    if (m) {
                                        const [_, name] = m;
                                        return \`<div class="tool-call loading"><div class="tool-header loading">Running \${name.replace(/_/g, ' ')}...</div></div>\`;
                                    }
                                }
                            }
                            
                            if (content.startsWith('<tool_result')) {
                                const m = content.match(/<tool_result id="([^"]+)">([\s\S]*?)<\/tool_result>/);
                                if (m) {
                                    return \`<div class="tool-result-marker" data-id="\${m[1]}" style="display:none">\${m[2]}</div>\`;
                                }
                            }
                            
                            return content;
                        }
                    }).join('');
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

                addMessage(role, content, id) {
                    const messagesContainer = document.getElementById('messages');
                    if (!messagesContainer) return;
                    
                    const div = document.createElement('div');
                    div.className = \`message \${role}\`;
                    if (id) {
                        div.id = id;
                        this.assistantMessages[id] = content;
                    }
                    
                    const contentDiv = document.createElement('div');
                    contentDiv.className = 'content';
                    contentDiv.innerHTML = this.renderMarkdown(content || '');
                    div.appendChild(contentDiv);
                    
                    this.finalizeToolCalls(div);
                    messagesContainer.appendChild(div);
                    this.scrollToBottom();
                }

                addMessageMetadata(id, metadata) {
                    const msgDiv = document.getElementById(id);
                    if (!msgDiv) return;
                    
                    const metaDiv = document.createElement('div');
                    metaDiv.className = 'message-metadata';
                    metaDiv.innerHTML = \`
                        <span>\${metadata.model}</span>
                        <span>•</span>
                        <span>\${metadata.tps} t/s</span>
                        <span>•</span>
                        <span>TTFT: \${metadata.ttft}ms</span>
                        <span>•</span>
                        <span>In: \${metadata.inputTokens}</span>
                        <span>•</span>
                        <span>Out: \${metadata.outputTokens}</span>
                    \`;
                    msgDiv.appendChild(metaDiv);
                    this.scrollToBottom();
                }
                
                updateMessage(msg) {
                    const msgDiv = document.getElementById(msg.id);
                    if (!msgDiv) return;
                    const contentDiv = msgDiv.querySelector('.content');
                    if (contentDiv) {
                        this.assistantMessages[msg.id] = (this.assistantMessages[msg.id] || '') + msg.content;
                        contentDiv.innerHTML = this.renderMarkdown(this.assistantMessages[msg.id]);
                        this.finalizeToolCalls(msgDiv);
                    }
                    this.scrollToBottom();
                }

                scrollToBottom() {
                    const container = document.getElementById('messages');
                    if (container) container.scrollTop = container.scrollHeight;
                }

                updateModels(msg) {
                    const select = document.getElementById('model-select');
                    if (!select) return;
                    
                    const hasModels = msg.models && msg.models.length > 0;
                    this.updateInputAvailability(hasModels, msg.loading);

                    select.innerHTML = msg.loading ? '<option>Loading...</option>' : 
                        (msg.models.length ? msg.models.map(m => \`<option value="\${m}" \${m === this.currentModel ? 'selected' : ''}>\${m}</option>\`).join('') : '<option>No models found</option>');
                }

                updateInputAvailability(hasModels, isLoading) {
                    const input = document.getElementById('chat-input');
                    const btn = document.getElementById('action-button');
                    const wrapper = input ? input.closest('.input-wrapper') : null;
                    
                    const disabled = !hasModels || isLoading;
                    if (input) {
                        input.disabled = disabled;
                        if (isLoading) {
                            input.placeholder = "Loading models...";
                        } else if (!hasModels) {
                            input.placeholder = "No models available. Check provider settings.";
                        } else {
                            input.placeholder = "Ask Mosaic...";
                        }
                    }
                    if (btn) btn.disabled = disabled;
                    if (wrapper) wrapper.classList.toggle('disabled', disabled);
                }

                updateChatList(chats) {
                    const list = document.getElementById('history-list');
                    if (!list) return;
                    list.innerHTML = chats.map(c => {
                        const date = new Date(c.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                        return \`
                        <div class="history-item" data-id="\${c.id}">
                            <div class="history-main">
                                <div class="history-info">
                                    <span class="history-name">\${c.name}</span>
                                    <span class="history-date">\${date}</span>
                                </div>
                                <button class="delete-btn" title="Delete Chat" onclick="event.stopPropagation(); this.closest('.history-item').classList.add('confirming')">
                                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M11 2H9c0-.55-.45-1-1-1s-1 .45-1 1H5c-.55 0-1 .45-1 1v1h8V3c0-.55-.45-1-1-1zM4.5 5l.5 9c0 .55.45 1 1 1h4c.55 0 1-.45 1-1l.5-9h-7z"/></svg>
                                </button>
                            </div>
                            <div class="history-confirm">
                                <span>Delete this chat?</span>
                                <div class="confirm-actions">
                                    <button class="confirm-yes" onclick="event.stopPropagation(); vscode.postMessage({ type: 'deleteChat', value: '\${c.id}' })">Delete</button>
                                    <button class="confirm-no" onclick="event.stopPropagation(); this.closest('.history-item').classList.remove('confirming')">Cancel</button>
                                </div>
                            </div>
                        </div>\`;
                    }).join('');
                }

                updateTodoList(todos) {
                    const container = document.getElementById('tasks-container');
                    const list = document.getElementById('tasks-list');
                    if (list) {
                        list.innerHTML = todos.length ? todos.map(t => \`<div class="history-item task-item \${t.status}">\${t.title}</div>\`).join('') : '';
                    }
                    if (container) {
                        container.style.display = todos.length ? 'block' : 'none';
                    }
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
            <div class="header-actions">
                <button id="new-chat-btn" title="New Chat">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M14 7v1H8v6H7V8H1V7h6V1h1v6h6z"/></svg>
                </button>
                <button id="history-btn" title="Recent Chats">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 1 0 7 7 7 7 0 0 0-7-7zm0 12.6A5.6 5.6 0 1 1 13.6 8 5.6 5.6 0 0 1 8 13.6zm.7-5.3L11 10.5l-.7.7-2.7-2.7V4h1z"/></svg>
                </button>
            </div>
        </div>
        <div id="tasks-container" style="display:none">
            <div id="tasks-header">Active Tasks</div>
            <div id="tasks-list"></div>
        </div>
        <div id="messages"></div>
        
        <div id="history-modal" class="history-modal" style="display:none">
            <div class="history-content">
                <div class="history-header">
                  <span>History</span>
                  <button class="close-modal" data-modal="history-modal">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1.146 1.146a.5.5 0 0 1 .708 0L8 7.293l6.146-6.147a.5.5 0 0 1 .708.708L8.707 8l6.147 6.146a.5.5 0 0 1-.708.708L8 8.707l-6.146 6.147a.5.5 0 0 1-.708-.708L7.293 8 1.146 1.854a.5.5 0 0 1 0-.708z"/></svg>
                  </button>
                </div>
                <div id="history-list"></div>
            </div>
        </div>

        <div id="input-container">
            <div class="input-wrapper">
                <textarea id="chat-input" placeholder="Ask Mosaic..." rows="1"></textarea>
                <button id="action-button" title="Send message"><span class="send-icon"></span></button>
            </div>
        </div>
        <div id="settings-bar">
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
