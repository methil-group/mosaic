export function renderWelcomeScreen(repoName: string, iconUri: string, provider?: string): string {
    return `
    <div id="welcome-screen">
        <div class="welcome-content">
            <div class="welcome-logo">
                <img src="${iconUri}" alt="Mosaic Logo" />
            </div>
            <div class="repo-badge">${repoName}</div>
            <h1 class="welcome-title">What do you want to build today?</h1>
            <div id="welcome-screen-logo">Mosaic</div>
            <div class="welcome-input-container">
                <div id="welcome-input-references" class="input-references"></div>
                <textarea id="welcome-chat-input" placeholder="Ask Mosaic anything..." rows="1"></textarea>
                <div id="welcome-autocomplete-list" class="autocomplete-list" style="display:none"></div>
                <div class="welcome-input-footer">
                    <div class="welcome-selectors">
                        <select id="welcome-provider-select" class="compact-select">
                            <option value="openrouter" ${provider === 'openrouter' ? 'selected' : ''}>OP</option>
                            <option value="lmstudio" ${provider === 'lmstudio' ? 'selected' : ''}>LMS</option>
                        </select>
                        <select id="welcome-model-select" class="compact-select model-select-common"></select>
                        <button class="mode-toggle mode-toggle-btn todo" data-mode="todo" data-tooltip="TODO Mode: The agent MUST use TODOs to plan its work. Includes all task management tools.">
                            <span class="codicon codicon-checklist"></span>
                            <span>TODO</span>
                        </button>
                    </div>
                    <div class="input-actions">
                        <button id="welcome-queue-button" class="queue-button" title="Queue message" style="display:none">
                            <span class="codicon codicon-list-ordered"></span>
                        </button>
                        <button id="welcome-action-button" title="Start session">
                            <span class="codicon codicon-arrow-right"></span>
                        </button>
                    </div>
                </div>
            </div>

            <div id="welcome-recent-chats" class="welcome-recent-chats" style="display:none">
                <div class="welcome-recent-header">Recent Conversations</div>
                <div id="welcome-chats-list"></div>
            </div>

            <div class="quick-actions">
                <div class="quick-action-item" data-action="analyze">
                    <span class="codicon codicon-search"></span>
                    <span>Analyze this project</span>
                </div>
                <div class="quick-action-item" data-action="test">
                    <span class="codicon codicon-beaker"></span>
                    <span>Generate unit tests</span>
                </div>
            </div>
        </div>
    </div>`;
}
