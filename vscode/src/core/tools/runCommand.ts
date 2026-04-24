import * as vscode from 'vscode';
import { BaseTool } from './base';

export class RunCommandTool extends BaseTool {
  name() { return "run_command"; }
  description() { return "Run a shell command in the integrated VSCode terminal. Use this for builds, installs, git, and testing."; }
  schema() {
    return {
      type: "object",
      properties: {
        command: { type: "string", description: "The shell command to execute" }
      },
      required: ["command"]
    };
  }

  async execute(args: { command: string }) {
    if (!args.command) return this.formatError("No command provided");
    
    const safetyError = this.validateCommand(args.command);
    if (safetyError) {
      return this.formatError(`SAFETY BLOCK: ${safetyError}`);
    }

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

  private validateCommand(command: string): string | null {
    const dangerousPatterns = [
      { pattern: /rm\s+-rf\s+[\/\~]/, reason: "Destructive operations on root (/) or home (~) directories are strictly forbidden." },
      { pattern: /rm\s+-rf\s+\.(git|mosaic)/, reason: "Critical project directories (.git, .mosaic) must be preserved." },
      { pattern: /mkfs|fdisk|parted/, reason: "Disk partitioning and formatting commands are blocked." },
      { pattern: /dd\s+.*of=\/dev\//, reason: "Direct block device writes via 'dd' are strictly forbidden." },
      { pattern: /:\(\)\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/, reason: "Fork bomb detected." },
      { pattern: /shutdown|reboot|halt/, reason: "System power commands are blocked." }
    ];

    const normalized = command.toLowerCase().trim();
    for (const { pattern, reason } of dangerousPatterns) {
      if (pattern.test(normalized)) return reason;
    }
    return null;
  }
}
