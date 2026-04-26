function log(msg, detail) {
    console.log('[Mosaic UI] ' + msg, detail || '');
    vscode.postMessage({ type: 'webviewLog', message: msg, detail: detail });
}

window.onerror = function(message, source, lineno, colno, error) {
    const err = `Error: ${message} at ${source}:${lineno}:${colno}`;
    vscode.postMessage({ type: 'webviewError', message: err, stack: error ? error.stack : '' });
    return true;
};

window.onunhandledrejection = function(event) {
    vscode.postMessage({ type: 'webviewError', message: 'Unhandled Promise Rejection: ' + event.reason });
};
