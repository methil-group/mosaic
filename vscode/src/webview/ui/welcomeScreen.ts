export function renderWelcomeScreen(repoName: string): string {
    return `
    <div id="welcome-screen">
        <div class="welcome-content">
            <div class="welcome-logo">
                <span class="codicon codicon-circuit-board"></span>
            </div>
            <div class="repo-badge">${repoName}</div>
            <h1 class="welcome-title">Que voulez-vous faire aujourd'hui ?</h1>
            
            <div class="welcome-input-container">
                <textarea id="welcome-chat-input" placeholder="Décrivez votre tâche ou posez une question..." rows="1"></textarea>
                <button id="welcome-action-button" title="Démarrer la session">
                    <span class="codicon codicon-arrow-right"></span>
                </button>
            </div>

            <div class="quick-actions">
                <div class="quick-action-item" data-action="analyze">
                    <span class="codicon codicon-search"></span>
                    <span>Analyser le projet</span>
                </div>
                <div class="quick-action-item" data-action="refactor">
                    <span class="codicon codicon-tools"></span>
                    <span>Refactoriser du code</span>
                </div>
                <div class="quick-action-item" data-action="test">
                    <span class="codicon codicon-beaker"></span>
                    <span>Générer des tests</span>
                </div>
            </div>
        </div>
    </div>`;
}
