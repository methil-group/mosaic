import * as vscode from 'vscode';
import * as path from 'path';
import { BaseTool } from './base';

export class ReadFileTool extends BaseTool {
  name() { return "read_file"; }
  description() { return "Read the content of a file."; }
  schema() {
    return {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to the file to read (relative or absolute)" }
      },
      required: ["path"]
    };
  }

  async execute(args: { path: string }) {
    if (!args.path) return this.formatError("No path provided");
    
    const fullPath = this.resolvePath(args.path);
    if (!fullPath) return this.formatError(`Access denied: '${args.path}' is outside the workspace.`);

    try {
      const uri = vscode.Uri.file(fullPath);
      const stat = await vscode.workspace.fs.stat(uri);
      if (stat.type === vscode.FileType.Directory) {
        return this.formatError(`'${args.path}' is a directory, not a file. Use 'list_directory' to see its contents.`);
      }

      const document = await vscode.workspace.openTextDocument(fullPath);
      return document.getText();
    } catch (e: any) {
      return this.formatError(`Failed to read file: ${e.message}`);
    }
  }
}

export class WriteFileTool extends BaseTool {
  name() { return "write_file"; }
  description() { return "Write content to a new file or overwrite an existing one."; }
  schema() {
    return {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to the file to write" },
        content: { type: "string", description: "Complete content to write to the file" }
      },
      required: ["path", "content"]
    };
  }

  async execute(args: { path: string, content: string }) {
    if (!args.path) return this.formatError("No path provided");
    
    const fullPath = this.resolvePath(args.path);
    if (!fullPath) return this.formatError(`Access denied: '${args.path}' is outside the workspace.`);

    try {
      const uri = vscode.Uri.file(fullPath);
      const uint8array = Buffer.from(args.content, 'utf8');
      await vscode.workspace.fs.writeFile(uri, uint8array);
      return { success: true, path: args.path };
    } catch (e: any) {
      return this.formatError(`Failed to write file: ${e.message}`);
    }
  }
}

export class EditFileTool extends BaseTool {
  name() { return "edit_file"; }
  description() { return "Perform a surgical find-and-replace in a file. Useful for making small changes without overwriting the whole file."; }
  schema() {
    return {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to the file to edit" },
        old_content: { type: "string", description: "The exact block of text to be replaced (must be unique in the file)" },
        new_content: { type: "string", description: "The new text to replace 'old_content' with" }
      },
      required: ["path", "old_content", "new_content"]
    };
  }

  async execute(args: { path: string, old_content: string, new_content: string }) {
    if (!args.path) return this.formatError("No path provided");
    if (!args.old_content) return this.formatError("No old_content provided");

    const fullPath = this.resolvePath(args.path);
    if (!fullPath) return this.formatError(`Access denied: '${args.path}' is outside the workspace.`);

    try {
      const uri = vscode.Uri.file(fullPath);
      const uint8array = await vscode.workspace.fs.readFile(uri);
      const content = Buffer.from(uint8array).toString('utf8');

      if (!content.includes(args.old_content)) {
        return this.formatError(`'old_content' not found in file: ${args.path}`);
      }

      const occurrences = (content.split(args.old_content).length - 1);
      if (occurrences > 1) {
        return this.formatError(`'old_content' found ${occurrences} times. Be more specific.`);
      }

      const newFullContent = content.replace(args.old_content, args.new_content);
      await vscode.workspace.fs.writeFile(uri, Buffer.from(newFullContent, 'utf8'));
      
      return { success: true, path: args.path };
    } catch (e: any) {
      return this.formatError(`Failed to edit file: ${e.message}`);
    }
  }
}

export class ListDirectoryTool extends BaseTool {
  name() { return "list_directory"; }
  description() { return "List files and directories in a given path. Use '.' for the current workspace root."; }
  schema() {
    return {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to list (relative or absolute). Defaults to current workspace root.", default: "." }
      }
    };
  }

  async execute(args: { path: string }) {
    const targetPath = args.path || ".";
    const fullPath = this.resolvePath(targetPath);
    if (!fullPath) return this.formatError(`Access denied: '${targetPath}' is outside the workspace.`);

    try {
      const uri = vscode.Uri.file(fullPath);
      const entries = await vscode.workspace.fs.readDirectory(uri);
      
      return entries.map(([name, type]) => ({
        name,
        type: type === vscode.FileType.Directory ? "directory" : "file"
      }));
    } catch (e: any) {
      return this.formatError(`Failed to list directory: ${e.message}`);
    }
  }
}
