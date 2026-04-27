import * as vscode from 'vscode';
import * as path from 'path';

export interface Tool {
  name(): string;
  description(): string;
  schema(): any;
  execute(args: any): Promise<any>;
}

export abstract class BaseTool implements Tool {
  abstract name(): string;
  abstract description(): string;
  abstract schema(): any;
  abstract execute(args: any): Promise<any>;

  protected formatError(message: string): string {
    return `Error: ${message}`;
  }

  protected resolvePath(targetPath: string): string | null {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return null;

    const rootPath = workspaceFolders[0].uri.fsPath;
    
    // Explicitly block home directory shortcut
    if (targetPath.startsWith('~')) {
      return null;
    }

    const fullPath = path.isAbsolute(targetPath) 
      ? path.normalize(targetPath) 
      : path.normalize(path.join(rootPath, targetPath));

    // Ensure the path is strictly within the workspace
    // We use path.relative to verify that the path doesn't go above the root
    const relative = path.relative(rootPath, fullPath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      return null;
    }

    return fullPath;
  }
}
