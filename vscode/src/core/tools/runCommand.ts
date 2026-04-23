import * as vscode from 'vscode';
import { BaseTool } from './base';

export class RunCommandTool extends BaseTool {
  name() { return "run_command"; }
  description() { return "Run a shell command in the VSCode terminal. Args: {command: string}"; }

  async execute(args: { command: string }) {
    if (!args.command) return this.formatError("No command provided");
    
    let terminal = vscode.window.terminals.find(t => t.name === "Mosaic Terminal");
    let isNew = false;
    
    if (!terminal) {
      terminal = vscode.window.createTerminal("Mosaic Terminal");
      isNew = true;
    }

    terminal.show(true);

    if (isNew) {
      // Wait for shell initialization (e.g., sourcing .zshrc)
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    terminal.sendText(args.command);
    return { message: `Command '${args.command}' has been sent to the terminal.` };
  }
}
