export function renderErrorScreen(iconUri: string): string {
    return `
    <div id="error-screen" class="centered-view">
        <div class="error-content">
            <div class="error-logo">
                <img src="${iconUri}" alt="Mosaic Logo" />
            </div>
            <h1 class="error-title">Oops!</h1>
            <p class="error-message">You ain't connected to a working folder...</p>
            <p class="error-sub">Mosaic needs an open workspace to analyze your code and help you build things.</p>
            <button id="open-folder-btn" class="primary-btn">Open Folder</button>
        </div>
    </div>`;
}
