class MosaicUI {
    constructor(currentModel) {
        log('Constructing MosaicUI...');
        this.isGenerating = false;
        this.assistantMessages = {};
        this.currentModel = currentModel || '';
        this.suggestions = [];
        this.suggestionIndex = 0;
        this.activeAutocompleteInput = null;
        this.queuedMessage = null;
        this.searchDebounceTimer = null;
        this.currentReferences = [];
        this.currentMode = 'todo';
        this.init();
    }

    init() {
        log('Initializing Event Delegation...');
        
        document.addEventListener('click', (e) => {
            const target = e.target.closest('button, .history-item, .tool-header, .thought-header, .quick-action-item, .autocomplete-item, .tool-group-header, .file-badge, .remove-chip, .close-modal, .delete-btn, .confirm-yes, .confirm-no, #rename-chat-btn, .continue-btn');
            if (!target) {
                this.closeAutocomplete();
                return;
            }

            log('Click detected on:', target.id || target.className);

            if (target.id === 'action-button' || target.closest('#action-button')) {
                this.handleAction();
            } else if (target.id === 'welcome-action-button' || target.closest('#welcome-action-button')) {
                this.handleWelcomeAction();
            } else if (target.id === 'save-setup-btn') {
                this.handleSaveSetup();
            } else if (target.id === 'queue-button' || target.closest('#queue-button') || target.id === 'welcome-queue-button' || target.closest('#welcome-queue-button')) {
                this.handleQueue();
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
            } else if (target.classList.contains('remove-chip')) {
                this.removeReference(target.getAttribute('data-file'));
            } else if (target.classList.contains('file-badge')) {
                const file = target.getAttribute('data-file');
                log('File Badge Clicked:', file);
                if (file) vscode.postMessage({ type: 'openFile', value: file });
            } else if (target.classList.contains('tool-header') || target.classList.contains('thought-header') || target.classList.contains('tool-group-header')) {
                target.parentElement.classList.toggle('open');
            } else if (target.classList.contains('history-item') && !target.classList.contains('task-item')) {
                if (target.classList.contains('confirming')) return;
                const chatId = target.getAttribute('data-id');
                if (chatId) {
                    log('Loading Chat:', chatId);
                    vscode.postMessage({ type: 'loadChat', value: chatId });
                    document.getElementById('history-modal').style.display = 'none';
                }
            } else if (target.classList.contains('autocomplete-item')) {
                this.selectSuggestion(target.innerText);
            } else if (target.classList.contains('continue-btn')) {
                const input = document.getElementById('chat-input');
                if (input) {
                    input.value = 'continue';
                    this.handleAction();
                    // Optionally remove the button to prevent multiple continues on the same message
                    target.closest('.continue-btn-container').remove();
                }
            } else if (target.classList.contains('mode-toggle-btn')) {
                this.currentMode = this.currentMode === 'todo' ? 'exec' : 'todo';
                const allBtns = document.querySelectorAll('.mode-toggle-btn');
                const isTodo = this.currentMode === 'todo';
                const icon = isTodo ? 'checklist' : 'zap';
                const tooltip = isTodo 
                    ? "TODO Mode: The agent MUST use TODOs to plan its work. Includes all task management tools."
                    : "EXEC Mode: Direct execution without TODO management tools.";
                
                allBtns.forEach(btn => {
                    btn.innerHTML = `<span class="codicon codicon-${icon}"></span> <span>${this.currentMode.toUpperCase()}</span>`;
                    btn.className = `mode-toggle mode-toggle-btn ${this.currentMode}`;
                    btn.setAttribute('data-mode', this.currentMode);
                    btn.setAttribute('data-tooltip', tooltip);
                });
                log('Switched to mode:', this.currentMode);
            }
        });

        const providerSelects = [document.getElementById('setup-provider'), document.getElementById('settings-provider')];
        providerSelects.forEach(select => {
            if (select) {
                select.addEventListener('change', (e) => {
                    const isSettings = select.id === 'settings-provider';
                    const prefix = isSettings ? 'settings-' : 'setup-';
                    const apiKeyGroup = document.getElementById(prefix + 'apikey-group');
                    const lmstudioUrlGroup = document.getElementById(prefix + 'lmstudio-url-group');
                    
                    if (e.target.value === 'lmstudio') {
                        if (apiKeyGroup) apiKeyGroup.style.display = 'none';
                        if (lmstudioUrlGroup) lmstudioUrlGroup.style.display = 'block';
                    } else {
                        if (apiKeyGroup) apiKeyGroup.style.display = 'block';
                        if (lmstudioUrlGroup) lmstudioUrlGroup.style.display = 'none';
                    }
                });
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.target.id === 'chat-input' || e.target.id === 'welcome-chat-input') {
                if (this.activeAutocompleteInput) {
                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        this.suggestionIndex = (this.suggestionIndex + 1) % this.suggestions.length;
                        this.renderSuggestions();
                        return;
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        this.suggestionIndex = (this.suggestionIndex - 1 + this.suggestions.length) % this.suggestions.length;
                        this.renderSuggestions();
                        return;
                    } else if (e.key === 'Enter' || e.key === 'Tab') {
                        if (this.suggestions.length > 0) {
                            e.preventDefault();
                            this.selectSuggestion(this.suggestions[this.suggestionIndex]);
                            return;
                        }
                    } else if (e.key === 'Escape') {
                        this.closeAutocomplete();
                        return;
                    }
                }

                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (e.target.id === 'chat-input') this.handleAction();
                    else this.handleWelcomeAction();
                }
            }
        });

        document.addEventListener('input', (e) => {
            if (e.target.id === 'chat-input' || e.target.id === 'welcome-chat-input') {
                const input = e.target;
                input.style.height = 'auto';
                input.style.height = input.scrollHeight + 'px';
                
                // Autocomplete check
                const text = input.value;
                const cursor = input.selectionStart;
                const lastAt = text.lastIndexOf('@', cursor - 1);
                
                if (lastAt !== -1 && !text.substring(lastAt, cursor).includes(' ')) {
                    const query = text.substring(lastAt + 1, cursor);
                    this.activeAutocompleteInput = input;
                    
                    // Debounce searchFiles
                    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
                    this.searchDebounceTimer = setTimeout(() => {
                        vscode.postMessage({ type: 'searchFiles', value: query });
                        this.searchDebounceTimer = null;
                    }, 300);
                } else {
                    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
                    this.closeAutocomplete();
                }

                // Persist state
                const state = vscode.getState() || {};
                state[e.target.id] = input.value;
                vscode.setState(state);

                this.updateReferences(input);
                this.updateQueueVisibility();
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
                this.currentModel = e.target.value;
                vscode.postMessage({ type: 'setModel', value: e.target.value });
                // Sync all model selects
                document.querySelectorAll('.model-select-common').forEach(s => {
                    if (s !== e.target) s.value = e.target.value;
                });
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
            if (this.isGenerating) {
                this.handleQueue();
                return;
            }
            this.setGenerating(true);
            vscode.postMessage({ type: 'sendMessage', value: text, model: this.currentModel, mode: this.currentMode });
            input.value = '';
            input.style.height = 'auto';
            // Clear state
            const state = vscode.getState() || {};
            delete state['welcome-chat-input'];
            vscode.setState(state);
            this.toggleWelcomeScreen(false);
        }
    }

    handleQueue() {
        const input = this.isWelcomeVisible() ? document.getElementById('welcome-chat-input') : document.getElementById('chat-input');
        const text = input ? input.value.trim() : '';
        if (text) {
            this.queuedMessage = text;
            input.value = '';
            input.style.height = 'auto';
            input.placeholder = 'Message queued...';
            
            // Clear persisted state for this input
            const state = vscode.getState() || {};
            delete state[input.id];
            vscode.setState(state);

            this.updateQueueButtons(true);
            this.addSystemMessage('Message queued. It will be sent automatically.');
        }
    }

    isWelcomeVisible() {
        const welcome = document.getElementById('welcome-screen');
        return welcome && welcome.style.display !== 'none';
    }

    updateQueueButtons(active) {
        const btns = [document.getElementById('queue-button'), document.getElementById('welcome-queue-button')];
        btns.forEach(btn => {
            if (btn) btn.classList.toggle('active', active);
        });
    }

    handleQuickAction(action) {
        let text = '';
        switch(action) {
            case 'analyze': text = 'Can you analyze this project?'; break;
            case 'test': text = 'Help me generate unit tests for the main components of this project.'; break;
        }
        if (text) {
            this.setGenerating(true);
            vscode.postMessage({ type: 'sendMessage', value: text, model: this.currentModel });
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
        const uEl = document.getElementById('settings-lmstudio-url');
        if (pEl) {
            const p = pEl.value;
            const k = kEl ? kEl.value : '';
            const u = uEl ? uEl.value : '';
            vscode.postMessage({ type: 'setProvider', value: p });
            if (k) vscode.postMessage({ type: 'setApiKey', value: k });
            if (u) vscode.postMessage({ type: 'setLmStudioUrl', value: u });
            this.toggleSettingsScreen(false);
        }
    }

    handleAction() {
        const input = document.getElementById('chat-input');
        if (this.isGenerating) {
            if (input && input.value.trim()) {
                this.handleQueue();
            } else {
                vscode.postMessage({ type: 'stopGeneration' });
            }
        } else {
            const text = input ? input.value.trim() : '';
            if (text) {
                this.setGenerating(true);
                vscode.postMessage({ type: 'sendMessage', value: text, model: this.currentModel, mode: this.currentMode });
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
        const uEl = document.getElementById('setup-lmstudio-url');
        if (pEl) {
            const p = pEl.value;
            const k = kEl ? kEl.value : '';
            const u = uEl ? uEl.value : '';
            vscode.postMessage({ type: 'setProvider', value: p });
            if (k) vscode.postMessage({ type: 'setApiKey', value: k });
            if (u) vscode.postMessage({ type: 'setLmStudioUrl', value: u });
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

    updateQueueVisibility() {
        const val = this.isGenerating;
        const chatInput = document.getElementById('chat-input');
        const welcomeInput = document.getElementById('welcome-chat-input');
        
        const showChat = val && chatInput && chatInput.value.trim().length > 0;
        const showWelcome = val && welcomeInput && welcomeInput.value.trim().length > 0;

        const qBtn = document.getElementById('queue-button');
        const wqBtn = document.getElementById('welcome-queue-button');

        if (qBtn) qBtn.style.display = showChat ? 'flex' : 'none';
        if (wqBtn) wqBtn.style.display = showWelcome ? 'flex' : 'none';
    }

    setGenerating(val) {
        this.isGenerating = val;
        const btn = document.getElementById('action-button');
        
        if (btn) {
            btn.classList.toggle('generating', val);
            btn.innerHTML = val ? '<span class="codicon codicon-debug-stop"></span>' : '<span class="codicon codicon-send"></span>';
        }

        this.updateQueueVisibility();

        if (!val) {
            this.checkQueue();
        }
    }

    checkQueue() {
        if (this.queuedMessage) {
            const text = this.queuedMessage;
            this.queuedMessage = null;
            this.updateQueueButtons(false);
            
            // Restore placeholders
            const inputs = [document.getElementById('chat-input'), document.getElementById('welcome-chat-input')];
            inputs.forEach(input => {
                if (input) input.placeholder = input.id === 'welcome-chat-input' ? 'Ask Mosaic anything...' : 'Ask Mosaic...';
            });

            setTimeout(() => {
                this.setGenerating(true);
                vscode.postMessage({ type: 'sendMessage', value: text });
            }, 500);
        }
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
            case 'fileSuggestions':
                this.handleFileSuggestions(msg.files);
                break;
        }
    }

    handleFileSuggestions(files) {
        if (!this.activeAutocompleteInput) return;
        this.suggestions = files || [];
        this.suggestionIndex = 0;
        this.renderSuggestions();
    }

    renderSuggestions() {
        if (!this.activeAutocompleteInput) return;
        const listId = this.activeAutocompleteInput.id === 'welcome-chat-input' ? 'welcome-autocomplete-list' : 'chat-autocomplete-list';
        const list = document.getElementById(listId);
        if (!list) return;

        if (this.suggestions.length === 0) {
            list.style.display = 'none';
            return;
        }

        list.innerHTML = this.suggestions.map((s, i) => {
            const iconClass = this.getIconForFile(s);
            return `
                <div class="autocomplete-item ${i === this.suggestionIndex ? 'selected' : ''}">
                    <span class="codicon ${iconClass}"></span>
                    <span>${s}</span>
                </div>
            `;
        }).join('');
        list.style.display = 'block';
    }

    getIconForFile(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        switch (ext) {
            case 'ts':
            case 'tsx': return 'codicon-file-code';
            case 'js':
            case 'jsx': return 'codicon-file-code';
            case 'json': return 'codicon-json';
            case 'md': return 'codicon-markdown';
            case 'css': return 'codicon-symbol-color';
            case 'html': return 'codicon-code';
            case 'py': return 'codicon-symbol-method';
            default: return 'codicon-file';
        }
    }

    selectSuggestion(file) {
        if (!this.activeAutocompleteInput) return;
        const input = this.activeAutocompleteInput;
        const text = input.value;
        const cursor = input.selectionStart;
        const lastAt = text.lastIndexOf('@', cursor - 1);
        
        if (lastAt !== -1) {
            const before = text.substring(0, lastAt);
            const after = text.substring(cursor);
            input.value = before + '@' + file + ' ' + after;
            input.focus();
            const newCursor = lastAt + file.length + 2;
            input.setSelectionRange(newCursor, newCursor);
        }
        this.closeAutocomplete();
        this.updateReferences(input);
        
        // Update persisted state
        const state = vscode.getState() || {};
        state[input.id] = input.value;
        vscode.setState(state);
    }

    closeAutocomplete() {
        this.activeAutocompleteInput = null;
        this.suggestions = [];
        this.suggestionIndex = 0;
        document.querySelectorAll('.autocomplete-list').forEach(l => l.style.display = 'none');
    }

    updateReferences(input) {
        const containerId = input.id === 'welcome-chat-input' ? 'welcome-input-references' : 'input-references';
        const container = document.getElementById(containerId);
        if (!container) return;

        const text = input.value;
        const matches = text.match(/@([^\s]+)/g) || [];
        const files = [...new Set(matches.map(m => m.substring(1)))];

        // Only update if references actually changed to avoid flickering
        const currentRefKey = files.sort().join('|');
        const lastRefKey = this.currentReferences.sort().join('|');
        
        if (currentRefKey === lastRefKey) return;
        this.currentReferences = files;

        if (files.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = files.map(f => {
            const icon = this.getIconForFile(f);
            return `
                <div class="file-chip">
                    <span class="codicon ${icon}"></span>
                    <span>${f}</span>
                    <span class="codicon codicon-close remove-chip" data-file="${f}"></span>
                </div>
            `;
        }).join('');
    }

    removeReference(file) {
        const input = this.isWelcomeVisible() ? document.getElementById('welcome-chat-input') : document.getElementById('chat-input');
        if (!input) return;
        
        const regex = new RegExp('@' + file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\s|$)', 'g');
        input.value = input.value.replace(regex, '');
        input.focus();
        this.updateReferences(input);
        
        const state = vscode.getState() || {};
        state[input.id] = input.value;
        vscode.setState(state);
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
        
        const modeBadge = metadata.mode ? `<span class="message-mode-badge ${metadata.mode}">${metadata.mode}</span>` : '';

        metaDiv.innerHTML = `
            ${modeBadge}
            <span class="meta-model">${metadata.model}</span>
            <span>•</span>
            <span>${metadata.tps} t/s</span>
            <span>•</span>
            <span>In: ${metadata.inputTokens} | Out: ${metadata.outputTokens}</span>
            ${metadata.cost && metadata.cost !== '0.00000' ? `<span>•</span> <span class="message-cost" title="Message Cost">$${metadata.cost}</span>` : '<span>•</span> <span class="message-cost free">free</span>'}
        `;
        if (metadata.totalCost) {
            this.updateSessionCost(metadata.totalCost);
        }
        msgDiv.appendChild(metaDiv);

        if (metadata.modifiedFiles && metadata.modifiedFiles.length > 0) {
            const filesDiv = document.createElement('div');
            filesDiv.className = 'modified-files-list';
            filesDiv.innerHTML = `
                <div class="modified-files-header">
                    <span class="codicon codicon-diff-added"></span>
                    <span>Files Updated</span>
                </div>
                <div class="file-grid">
                    ${metadata.modifiedFiles.map(f => {
                        const name = f.split('/').pop().split('\\').pop();
                        const icon = this.getIconForFile(f);
                        return `<div class="file-badge file clickable" data-file="${f}" title="${f}"><span class="codicon ${icon}"></span> ${name}</div>`;
                    }).join('')}
                </div>
            `;
            msgDiv.appendChild(filesDiv);
        }

        // Add Continue button for assistant messages
        if (msgDiv.classList.contains('assistant')) {
            const continueContainer = document.createElement('div');
            continueContainer.className = 'continue-btn-container';
            continueContainer.innerHTML = `
                <button class="continue-btn" title="Demander au LLM de continuer sa réponse ou d'aller plus loin dans la tâche">
                    <span class="codicon codicon-play"></span>
                    <span>Continue</span>
                </button>
            `;
            msgDiv.appendChild(continueContainer);
        }

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
        if (msg.currentModel) this.currentModel = msg.currentModel;
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
                const modelId = typeof m === 'string' ? m : m.id;
                const modelName = typeof m === 'string' ? m : (m.name || m.id);
                const pricing = (typeof m === 'string' || !m.pricing) ? null : m.pricing;
                
                let pricingStr = '';
                let shortPricing = '';
                if (pricing) {
                    if (pricing.prompt === 0 && pricing.completion === 0) {
                        pricingStr = ' (free)';
                        shortPricing = ' (free)';
                    } else {
                        pricingStr = ` ($${pricing.prompt.toFixed(2)}/$${pricing.completion.toFixed(2)} per 1M)`;
                        shortPricing = ' (paid)';
                    }
                }

                const parts = modelId.split('/');
                const short = parts[parts.length - 1];
                const displayShort = short + shortPricing;
                const displayFull = modelName + pricingStr;
                
                const display = isFocused ? displayFull : displayShort;
                return `<option value="${modelId}" data-full="${displayFull}" data-short="${displayShort}" ${modelId === this.currentModel ? 'selected' : ''}>${display}</option>`;
            }).join('');
        });
    }

    updateSessionCost(totalCost) {
        const costEl = document.getElementById('session-total-cost');
        if (costEl) {
            costEl.innerText = `$${parseFloat(totalCost).toFixed(4)}`;
            costEl.parentElement.style.display = totalCost > 0 ? 'flex' : 'none';
        }
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
