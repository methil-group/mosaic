// Minimal VSCode API mock for Jest unit tests
export const workspace = {
  workspaceFolders: [],
  getConfiguration: () => ({
    get: () => undefined,
    update: async () => {},
  }),
};

export const window = {
  terminals: [],
  createTerminal: (name: string) => ({
    name,
    show: () => {},
    sendText: () => {},
    dispose: () => {},
  }),
  showInformationMessage: () => {},
  showErrorMessage: () => {},
};

export const commands = {
  registerCommand: () => ({ dispose: () => {} }),
  executeCommand: async () => {},
  getCommands: async () => [],
};

export const extensions = {
  getExtension: () => undefined,
};

export class Uri {
  static file(path: string) { return { fsPath: path, scheme: 'file' }; }
  static joinPath(...args: any[]) { return { fsPath: args.join('/') }; }
}

export class EventEmitter {
  event = () => {};
  fire() {}
  dispose() {}
}

export enum ViewColumn {
  One = 1,
  Two = 2,
}
