export function renderSettingsScreen(provider?: string, apiKey?: string, lmStudioUrl?: string): string {
    return `
    <div id="settings-screen" style="display:none">
        <div class="settings-header">
            <button id="settings-back-btn" title="Back">
                <span class="codicon codicon-arrow-left"></span>
            </button>
            <span>Settings</span>
        </div>
        <div class="settings-content">
            <div class="setup-group">
                <label>AI Provider</label>
                <select id="settings-provider">
                    <option value="openrouter" ${provider === 'openrouter' ? 'selected' : ''}>OpenRouter</option>
                    <option value="lmstudio" ${provider === 'lmstudio' ? 'selected' : ''}>LM Studio (Local)</option>
                </select>
            </div>
            <div class="setup-group" id="settings-apikey-group" style="${provider === 'lmstudio' ? 'display:none;' : ''}">
                <label>API Key</label>
                <input type="password" id="settings-apikey" value="${apiKey || ''}" placeholder="sk-or-v1-..." />
                <p class="settings-help">Your key is stored locally in VS Code's global state.</p>
            </div>
            <div class="setup-group" id="settings-lmstudio-url-group" style="${provider !== 'lmstudio' ? 'display:none;' : ''}">
                <label>LM Studio URL</label>
                <input type="text" id="settings-lmstudio-url" value="${lmStudioUrl || 'http://localhost:1234/v1'}" placeholder="http://localhost:1234/v1" />
            </div>
            <button id="save-settings-btn" class="primary-btn">Save Changes</button>
        </div>
    </div>`;
}
