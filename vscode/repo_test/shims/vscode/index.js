const path = require('path');
const fs = require('fs');

const FileType = {
    Unknown: 0,
    File: 1,
    Directory: 2,
    SymbolicLink: 64
};

module.exports = {
    FileType,
    workspace: {
        workspaceFolders: undefined,
        fs: {
            stat: async (uri) => {
                const s = fs.statSync(uri.fsPath);
                return {
                    type: s.isDirectory() ? FileType.Directory : FileType.File,
                    ctime: s.ctimeMs,
                    mtime: s.mtimeMs,
                    size: s.size
                };
            },
            readFile: async (uri) => {
                return new Uint8Array(fs.readFileSync(uri.fsPath));
            },
            writeFile: async (uri, content) => {
                fs.writeFileSync(uri.fsPath, content);
            },
            readDirectory: async (uri) => {
                const entries = fs.readdirSync(uri.fsPath, { withFileTypes: true });
                return entries.map(e => [e.name, e.isDirectory() ? FileType.Directory : FileType.File]);
            }
        },
        openTextDocument: async (p) => {
            const content = fs.readFileSync(typeof p === 'string' ? p : p.fsPath, 'utf8');
            return {
                getText: () => content,
                uri: typeof p === 'string' ? { fsPath: p } : p
            };
        },
        getConfiguration: () => ({
            get: (key) => undefined
        }),
        onDidSaveTextDocument: () => ({ dispose: () => {} })
    },
    Uri: {
        file: (p) => ({ fsPath: p, scheme: 'file' }),
        parse: (p) => ({ fsPath: p, scheme: 'file' })
    },
    window: {
        showInformationMessage: async () => {},
        showErrorMessage: async () => {},
        createOutputChannel: () => ({ appendLine: () => {}, show: () => {} })
    }
};
