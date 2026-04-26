import { renderWelcomeScreen } from './welcomeScreen';
import { renderSettingsScreen } from './settingsScreen';

export function renderChatScreen(repoName: string, iconUri: string, provider?: string, apiKey?: string): string {
    return `
    <div id="chat-header">
        <span id="active-chat-title">New Chat</span>
        <div class="header-actions">
            <button id="settings-btn" title="Settings">
                <span class="codicon codicon-settings"></span>
            </button>
            <button id="new-chat-btn" title="New Chat">
                <span class="codicon codicon-add"></span>
            </button>
            <button id="history-btn" title="Recent Chats">
                <span class="codicon codicon-history"></span>
            </button>
        </div>
    </div>
    <div id="tasks-container" style="display:none">
        <div id="tasks-header">Active Tasks</div>
        <div id="tasks-list"></div>
    </div>
    
    ${renderWelcomeScreen(repoName, iconUri)}
    
    ${renderSettingsScreen(provider, apiKey)}

    <div id="messages" style="display:none"></div>
    
    <div id="history-modal" class="history-modal" style="display:none">
        <div class="history-content">
            <div class="history-header">
              <span>History</span>
              <button class="close-modal" data-modal="history-modal">
                <span class="codicon codicon-close"></span>
              </button>
            </div>
            <div id="history-list"></div>
        </div>
    </div>

    <div id="input-container" style="display:none">
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
