class MosaicUI {
    constructor(currentModel) {
        log('Constructing MosaicUI...');
        this.isGenerating = false;
        this.assistantMessages = {};
        this.currentModel = currentModel || '';
        this.init();
    }

    init() {
        log('Initializing Event Delegation...');
        
        document.addEventListener('click', (e) => {
            const target = e.target.closest('button, .history-item, .tool-header, .thought-header, .quick-action-item');
            if (!target) return;

            log('Click detected on:', target.id || target.className);

            if (target.id === 'action-button' || target.closest('#action-button')) {
                this.handleAction();
            } else if (target.id === 'save-setup-btn') {
                this.handleSaveSetup();
            } else if (target.id === 'history-btn' || target.closest('#history-btn')) {
                this.toggleModal('history-modal', 'listChats');
            } else if (target.id === 'new-chat-btn' || target.closest('#new-chat-btn')) {
                vscode.postMessage({ type: 'resetChat' });
            } else if (target.id === 'settings-btn' || target.closest('#settings-btn')) {
                this.toggleSettingsScreen(true);
            } else if (target.id === 'settings-back-btn' || target.closest('#settings-back-btn')) {
                this.toggleSettingsScreen(false);
            } else if (target.id === 'rename-chat-btn' || target.closest('#rename-chat-btn')) {
                this.handleRenameChat();
            } else if (target.id === 'save-settings-btn') {
                this.handleSaveSettings();
            } else if (target.id === 'welcome-action-button' || target.closest('#welcome-action-button')) {
                this.handleWelcomeAction();
            } else if (target.id === 'open-folder-btn' || target.closest('#open-folder-btn')) {
                vscode.postMessage({ type: 'openFolder' });
            } else if (target.classList.contains('quick-action-item')) {
                const action = target.getAttribute('data-action');
                this.handleQuickAction(action);
            } else if (target.classList.contains('close-modal')) {
                const modalId = target.getAttribute('data-modal');
                if (modalId) document.getElementById(modalId).style.display = 'none';
            } else if (target.classList.contains('delete-btn')) {
                e.stopPropagation();
                target.closest('.history-item').classList.add('confirming');
            } else if (target.classList.contains('confirm-yes')) {
                e.stopPropagation();
                const item = target.closest('.history-item');
                const chatId = item.getAttribute('data-id');
                if (chatId) {
                    log('Deleting Chat:', chatId);
                    vscode.postMessage({ type: 'deleteChat', value: chatId });
                }
            } else if (target.classList.contains('confirm-no')) {
                e.stopPropagation();
                target.closest('.history-item').classList.remove('confirming');
            } else if (target.classList.contains('history-item') && !target.classList.contains('task-item')) {
                if (target.classList.contains('confirming')) return;
                const chatId = target.getAttribute('data-id');
                if (chatId) {
                    log('Loading Chat:', chatId);
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
            } else if (e.target.id === 'welcome-chat-input') {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleWelcomeAction();
                }
            }
        });

        document.addEventListener('input', (e) => {
            if (e.target.id === 'chat-input' || e.target.id === 'welcome-chat-input') {
                const input = e.target;
                input.style.height = 'auto';
                input.style.height = input.scrollHeight + 'px';
                
                // Persist state
                const state = vscode.getState() || {};
                state[e.target.id] = input.value;
                vscode.setState(state);
            }
            if (e.target.id === 'setup-provider') {
                const apikeyGroup = document.getElementById('apikey-group');
                if (apikeyGroup) apikeyGroup.style.display = e.target.value === 'lmstudio' ? 'none' : 'block';
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target.id === 'provider-select' || e.target.id === 'welcome-provider-select') {
                vscode.postMessage({ type: 'setProvider', value: e.target.value });
            } else if (e.target.id === 'model-select' || e.target.id === 'welcome-model-select') {
                vscode.postMessage({ type: 'setModel', value: e.target.value });
                e.target.blur();
            } else if (e.target.id === 'settings-provider') {
                const apikeyGroup = document.getElementById('settings-apikey-group');
                if (apikeyGroup) apikeyGroup.style.display = e.target.value === 'lmstudio' ? 'none' : 'block';
            }
        });

        window.addEventListener('message', event => {
            this.handleMessage(event.data);
        });
        
        const modelSelects = document.querySelectorAll('.model-select-common');
        if (modelSelects.length > 0) {
            vscode.postMessage({ type: 'fetchModels' });
            vscode.postMessage({ type: 'getHistory' });
            
            modelSelects.forEach(select => {
                select.addEventListener('focus', () => {
                    Array.from(select.options).forEach(opt => {
                        if (opt.dataset.full) opt.text = opt.dataset.full;
                    });
                });
                
                select.addEventListener('blur', () => {
                    Array.from(select.options).forEach(opt => {
                        if (opt.dataset.short) opt.text = opt.dataset.short;
                    });
                });
            });
        }
        
        // Restore state
        const savedState = vscode.getState();
        if (savedState) {
            const chatInput = document.getElementById('chat-input');
            const welcomeInput = document.getElementById('welcome-chat-input');
            if (chatInput && savedState['chat-input']) {
                chatInput.value = savedState['chat-input'];
                chatInput.style.height = 'auto';
                chatInput.style.height = chatInput.scrollHeight + 'px';
            }
            if (welcomeInput && savedState['welcome-chat-input']) {
                welcomeInput.value = savedState['welcome-chat-input'];
                welcomeInput.style.height = 'auto';
                welcomeInput.style.height = welcomeInput.scrollHeight + 'px';
            }
        }

        log('Mosaic UI Ready');
        vscode.postMessage({ type: 'ready' });
    }

    handleWelcomeAction() {
        const input = document.getElementById('welcome-chat-input');
        const text = input ? input.value.trim() : '';
        if (text) {
            this.setGenerating(true);
            vscode.postMessage({ type: 'sendMessage', value: text });
            input.value = '';
            input.style.height = 'auto';
            // Clear state
            const state = vscode.getState() || {};
            delete state['welcome-chat-input'];
            vscode.setState(state);
            this.toggleWelcomeScreen(false);
        }
    }

    handleQuickAction(action) {
        let text = '';
        switch(action) {
            case 'analyze': text = 'Can you analyze this project?'; break;
            case 'test': text = 'Help me generate unit tests for the main components of this project.'; break;
        }
        if (text) {
            this.setGenerating(true);
            vscode.postMessage({ type: 'sendMessage', value: text });
            this.toggleWelcomeScreen(false);
        }
    }

    toggleWelcomeScreen(show) {
        const welcome = document.getElementById('welcome-screen');
        const messages = document.getElementById('messages');
        const input = document.getElementById('input-container');
        const settings = document.getElementById('settings-screen');
        
        if (welcome) welcome.style.display = show ? 'flex' : 'none';
        if (messages) messages.style.display = show ? 'none' : 'flex';
        if (input) input.style.display = show ? 'none' : 'block';
        if (settings) settings.style.display = 'none';
    }

    toggleSettingsScreen(show) {
        const settings = document.getElementById('settings-screen');
        const welcome = document.getElementById('welcome-screen');
        const messages = document.getElementById('messages');
        const input = document.getElementById('input-container');
        const header = document.getElementById('chat-header');
        const settingsBar = document.getElementById('settings-bar');

        if (settings) settings.style.display = show ? 'flex' : 'none';
        
        if (show) {
            if (welcome) welcome.style.display = 'none';
            if (messages) messages.style.display = 'none';
            if (input) input.style.display = 'none';
            if (header) header.style.display = 'none';
            if (settingsBar) settingsBar.style.display = 'none';
        } else {
            const hasMessages = messages && messages.querySelectorAll('.message').length > 0;
            if (hasMessages) {
                if (messages) messages.style.display = 'flex';
                if (input) input.style.display = 'block';
            } else {
                if (welcome) welcome.style.display = 'flex';
            }
            if (header) header.style.display = 'flex';
            if (settingsBar) settingsBar.style.display = 'flex';
        }
    }

    handleSaveSettings() {
        const pEl = document.getElementById('settings-provider');
        const kEl = document.getElementById('settings-apikey');
        if (pEl) {
            const p = pEl.value;
            const k = kEl ? kEl.value : '';
            vscode.postMessage({ type: 'setProvider', value: p });
            if (k) vscode.postMessage({ type: 'setApiKey', value: k });
            this.toggleSettingsScreen(false);
        }
    }

    handleAction() {
        const input = document.getElementById('chat-input');
        if (this.isGenerating) {
            vscode.postMessage({ type: 'stopGeneration' });
        } else {
            const text = input ? input.value.trim() : '';
            if (text) {
                this.setGenerating(true);
                vscode.postMessage({ type: 'sendMessage', value: text });
                input.value = '';
                input.style.height = 'auto';
                // Clear state
                const state = vscode.getState() || {};
                delete state['chat-input'];
                vscode.setState(state);
            }
        }
    }

    handleRenameChat() {
        const titleEl = document.getElementById('active-chat-title');
        const currentTitle = titleEl ? titleEl.innerText : 'New Chat';
        const newTitle = prompt('Enter new chat title:', currentTitle);
        if (newTitle && newTitle !== currentTitle) {
            vscode.postMessage({ type: 'updateTitle', value: newTitle.trim() });
        }
    }

    handleSaveSetup() {
        const pEl = document.getElementById('setup-provider');
        const kEl = document.getElementById('setup-apikey');
        if (pEl) {
            const p = pEl.value;
            const k = kEl ? kEl.value : '';
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
        btn.innerHTML = val ? '<span class="codicon codicon-debug-stop"></span>' : '<span class="codicon codicon-send"></span>';
    }

    handleMessage(msg) {
        switch (msg.type) {
            case 'addMessage': this.addMessage(msg.role, msg.content, msg.id); break;
            case 'updateMessage': this.updateMessage(msg); break;
            case 'generationStarted': this.setGenerating(true); break;
            case 'generationFinished': this.setGenerating(false); break;
            case 'setAvailableModels': this._updateModels(msg); break;
            case 'generationMetadata': this.addMessageMetadata(msg.id, msg.metadata); break;
            case 'chatList': this.updateChatList(msg.chats); break;
            case 'todoList': this.updateTodoList(msg.todos); break;
            case 'addSystemMessage': this.addSystemMessage(msg.content); break;
            case 'setTitle':
                const titleEl = document.getElementById('active-chat-title');
                if (titleEl) titleEl.innerText = msg.title;
                break;
            case 'clearMessages': 
                const container = document.getElementById('messages');
                if (container) container.innerHTML = ''; 
                const welcomeTitleEl = document.getElementById('active-chat-title');
                if (welcomeTitleEl) welcomeTitleEl.innerText = 'New Chat';
                this.toggleWelcomeScreen(true);
                break;
        }
    }

    addMessage(role, content, id) {
        this.toggleWelcomeScreen(false);
        const messagesContainer = document.getElementById('messages');
        if (!messagesContainer) return;
        
        const div = document.createElement('div');
        div.className = `message ${role}`;
        if (id) {
            div.id = id;
            this.assistantMessages[id] = content;
        }
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'content';
        contentDiv.innerHTML = renderMarkdown(content || '');
        div.appendChild(contentDiv);
        
        finalizeToolCalls(div);
        messagesContainer.appendChild(div);
        this.scrollToBottom();
    }

    addMessageMetadata(id, metadata) {
        const msgDiv = document.getElementById(id);
        if (!msgDiv) return;
        
        const metaDiv = document.createElement('div');
        metaDiv.className = 'message-metadata';
        metaDiv.innerHTML = `
            <span>${metadata.model}</span>
            <span>•</span>
            <span>${metadata.tps} t/s</span>
            <span>•</span>
            <span>TTFT: ${metadata.ttft}ms</span>
            <span>•</span>
            <span>In: ${metadata.inputTokens}</span>
            <span>•</span>
            <span>Out: ${metadata.outputTokens}</span>
        `;
        msgDiv.appendChild(metaDiv);
        this.scrollToBottom();
    }
    
    updateMessage(msg) {
        const msgDiv = document.getElementById(msg.id);
        if (!msgDiv) return;
        const contentDiv = msgDiv.querySelector('.content');
        if (contentDiv) {
            this.assistantMessages[msg.id] = (this.assistantMessages[msg.id] || '') + msg.content;
            contentDiv.innerHTML = renderMarkdown(this.assistantMessages[msg.id]);
            finalizeToolCalls(msgDiv);
        }
        this.scrollToBottom();
    }

    scrollToBottom() {
        const container = document.getElementById('messages');
        if (container) container.scrollTop = container.scrollHeight;
    }

    _updateModels(msg) {
        const selects = document.querySelectorAll('.model-select-common');
        if (selects.length === 0) return;
        
        const hasModels = msg.models && msg.models.length > 0;
        this._updateInputAvailability(hasModels, msg.loading);

        selects.forEach(select => {
            if (msg.loading) {
                select.innerHTML = '<option>Loading...</option>';
                return;
            }

            if (!msg.models || !msg.models.length) {
                select.innerHTML = '<option>No models found</option>';
                return;
            }

            const isFocused = document.activeElement === select;
            select.innerHTML = msg.models.map(m => {
                const parts = m.split('/');
                const short = parts[parts.length - 1];
                const display = isFocused ? m : short;
                return `<option value="${m}" data-full="${m}" data-short="${short}" ${m === this.currentModel ? 'selected' : ''}>${display}</option>`;
            }).join('');
        });
    }

    _updateInputAvailability(hasModels, isLoading) {
        const inputs = [document.getElementById('chat-input'), document.getElementById('welcome-chat-input')];
        const buttons = [document.getElementById('action-button'), document.getElementById('welcome-action-button')];
        
        const disabled = !hasModels || isLoading;
        
        inputs.forEach(input => {
            if (!input) return;
            input.disabled = disabled;
            const isWelcome = input.id === 'welcome-chat-input';
            if (isLoading) {
                input.placeholder = 'Loading models...';
            } else if (!hasModels) {
                input.placeholder = 'No models available. Check provider settings.';
            } else {
                input.placeholder = isWelcome ? 'Ask Mosaic anything...' : 'Ask Mosaic...';
            }
            
            const wrapper = input.closest('.input-wrapper, .welcome-input-container');
            if (wrapper) wrapper.classList.toggle('disabled', disabled);
        });

        buttons.forEach(btn => {
            if (btn) btn.disabled = disabled;
        });
    }

    updateChatList(chats) {
        const list = document.getElementById('history-list');
        const welcomeList = document.getElementById('welcome-chats-list');
        const welcomeContainer = document.getElementById('welcome-recent-chats');

        const chatHtml = chats.map(c => {
            const date = new Date(c.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            return `
            <div class="history-item" data-id="${c.id}">
                <div class="history-main">
                    <div class="history-info">
                        <span class="history-name">${c.name}</span>
                        <span class="history-date">${date}</span>
                    </div>
                    <button class="delete-btn" title="Delete Chat">
                        <span class="codicon codicon-trash"></span>
                    </button>
                </div>
                <div class="history-confirm">
                    <span>Delete this chat?</span>
                    <div class="confirm-actions">
                        <button class="confirm-yes">Delete</button>
                        <button class="confirm-no">Cancel</button>
                    </div>
                </div>
            </div>`;
        }).join('');

        if (list) list.innerHTML = chatHtml;

        if (welcomeList) {
            const recentChats = chats.slice(0, 3);
            welcomeList.innerHTML = recentChats.map(c => {
                const date = new Date(c.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                return `
                <div class="history-item" data-id="${c.id}">
                    <div class="history-main">
                        <div class="history-info">
                            <span class="history-name">${c.name}</span>
                            <span class="history-date">${date}</span>
                        </div>
                    </div>
                </div>`;
            }).join('');
            
            if (welcomeContainer) {
                welcomeContainer.style.display = recentChats.length > 0 ? 'block' : 'none';
            }
        }
    }

    updateTodoList(todos) {
        const container = document.getElementById('tasks-container');
        const list = document.getElementById('tasks-list');
        if (list) {
            list.innerHTML = todos.length ? todos.map(t => `<div class="history-item task-item ${t.status}">${t.title}</div>`).join('') : '';
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
