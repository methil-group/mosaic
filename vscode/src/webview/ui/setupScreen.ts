export function renderSetupScreen(provider?: string, apiKey?: string): string {
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
