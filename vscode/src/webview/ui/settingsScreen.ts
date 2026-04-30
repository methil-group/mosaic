export function renderSettingsScreen(provider?: string, apiKey?: string, lmStudioUrl?: string, maxToolCalls: number = 10, preserveThinking: boolean = false): string {
    return `
    <div id="settings-screen" style="display:none">
        <div class="settings-header">
            <button id="settings-back-btn" title="Back">
                <span class="codicon codicon-arrow-left"></span>
            </button>
            <span>Settings</span>
        </div>
        <div class="settings-content">
            <div class="settings-section">
                <div class="section-title">Connectivity</div>
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
            </div>

            <div class="settings-section">
                <div class="section-title">Agent Configuration</div>
                <div class="setup-group">
                    <div class="label-with-info">
                        <label>Max Tool Calls</label>
                        <span class="codicon codicon-info" title="Limits how many tools the agent can call in a single reasoning loop to prevent infinite loops and save cost."></span>
                    </div>
                    <input type="number" id="settings-max-tools" value="${maxToolCalls}" min="1" max="100" />
                </div>
                <div class="setup-group">
                    <div class="label-with-info">
                        <label>Preserve Thinking</label>
                        <span class="codicon codicon-info" title="If enabled, the agent's internal thoughts are kept in the conversation history. This uses more context tokens but might improve complex reasoning."></span>
                    </div>
                    <div class="checkbox-wrapper">
                        <input type="checkbox" id="settings-preserve-thinking" ${preserveThinking ? 'checked' : ''} />
                        <span>Keep thoughts in context</span>
                    </div>
                </div>
            </div>

            <button id="save-settings-btn" class="primary-btn">Save Changes</button>
        </div>
    </div>`;
}
