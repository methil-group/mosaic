import * as vscode from 'vscode';
import { BaseTool } from './base';

export class RunCommandTool extends BaseTool {
  name() { return "run_command"; }
  description() { return "Run a shell command in the VSCode terminal. Args: {command: string}"; }

  async execute(args: { command: string }) {
    if (!args.command) return this.formatError("No command provided");

    return new Promise((resolve) => {
      const terminal = vscode.window.terminals.find(t => t.name === "Mosaic Terminal") || vscode.window.createTerminal("Mosaic Terminal");
      terminal.show(true); // true = preserveFocus
      terminal.sendText(args.command);
      
      // Note: Getting terminal output programmatically is tricky in VSCode without complex extensions.
      // For now, we'll inform the LLM that the command was sent.
      resolve({ message: `Command '${args.command}' has been sent to the terminal.` });
    });
  }
}
