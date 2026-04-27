import { renderWelcomeScreen } from './welcomeScreen';
import { renderSettingsScreen } from './settingsScreen';

export function renderChatScreen(repoName: string, iconUri: string, provider?: string, apiKey?: string, lmStudioUrl?: string): string {
    return `
    <div id="chat-header">
        <div class="title-container">
            <span id="active-chat-title">New Chat</span>
            <span id="rename-chat-btn" class="codicon codicon-edit" title="Rename Chat"></span>
        </div>
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
    
    ${renderWelcomeScreen(repoName, iconUri, provider)}
    
    ${renderSettingsScreen(provider, apiKey, lmStudioUrl)}

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
            <div id="input-references" class="input-references"></div>
            <textarea id="chat-input" placeholder="Ask Mosaic..." rows="1"></textarea>
            <div id="chat-autocomplete-list" class="autocomplete-list" style="display:none"></div>
            <div class="input-footer">
                <div class="input-selectors">
                    <select id="provider-select" class="compact-select">
                        <option value="openrouter" ${provider === 'openrouter' ? 'selected' : ''}>OP</option>
                        <option value="lmstudio" ${provider === 'lmstudio' ? 'selected' : ''}>LMS</option>
                    </select>
                    <select id="model-select" class="compact-select model-select-common"></select>
                </div>
                <div class="input-actions">
                    <button id="queue-button" class="queue-button" title="Queue message" style="display:none">
                        <span class="codicon codicon-list-ordered"></span>
                    </button>
                    <button id="action-button" title="Send message"><span class="send-icon"></span></button>
                </div>
            </div>
        </div>
    </div>`;
}
