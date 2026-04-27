import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';
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

    const workspaceFolders = vscode.workspace.workspaceFolders;
    const cwd = workspaceFolders ? workspaceFolders[0].uri.fsPath : process.cwd();

    // Show in terminal for visual feedback
    let terminal = vscode.window.terminals.find(t => t.name === "Mosaic Terminal");
    if (!terminal) {
      terminal = vscode.window.createTerminal("Mosaic Terminal");
    }
    terminal.show(true);
    terminal.sendText(args.command);

    // Execute and capture output
    return new Promise((resolve) => {
      cp.exec(args.command, { cwd, timeout: 60000, maxBuffer: 1024 * 1024 }, (error: any, stdout: string, stderr: string) => {
        if (error) {
          resolve(this.formatError(`Command failed with exit code ${error.code}\nStdout: ${stdout}\nStderr: ${stderr}`));
          return;
        }
        resolve(stdout || stderr || "Command executed successfully (no output)");
      });
    });
  }

  private validateCommand(command: string): string | null {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const rootPath = workspaceFolders ? workspaceFolders[0].uri.fsPath : null;

    const dangerousPatterns = [
      { pattern: new RegExp("rm\\s+-rf\\s+[\\/~]"), reason: "Destructive operations on root (/) or home (~) directories are strictly forbidden." },
      { pattern: new RegExp("rm\\s+-rf\\s+\\.(git|mosaic)"), reason: "Critical project directories (.git, .mosaic) must be preserved." },
      { pattern: new RegExp("mkfs|fdisk|parted"), reason: "Disk partitioning and formatting commands are blocked." },
      { pattern: new RegExp("dd\\s+.*of=\\/dev\\/"), reason: "Direct block device writes via 'dd' are strictly forbidden." },
      { pattern: new RegExp(":\\(\\)\\{\\s*:\\s*\\|\\s*:\\s*&\\s*\\}\\s*;\\s*:"), reason: "Fork bomb detected." },
      { pattern: new RegExp("shutdown|reboot|halt"), reason: "System power commands are blocked." }
    ];

    const normalized = command.toLowerCase().trim();
    for (const { pattern, reason } of dangerousPatterns) {
      if (pattern.test(normalized)) return reason;
    }

    // Home directory protection
    if (command.includes('~')) {
      return "Access to home directory (~) is strictly forbidden.";
    }

    // Path traversal protection
    if (command.includes('..')) {
      const upCount = (command.match(/\.\.\//g) || []).length;
      if (upCount > 0) {
        // Even one '..' can be dangerous if it goes above root.
        // For simplicity and maximum safety, we block '..' in commands unless strictly needed.
        // But some build commands might use them. Let's be conservative.
        if (upCount > 2) return "Potential path traversal detected.";
      }
    }

    // Absolute path protection
    if (rootPath) {
      // Improved regex to find absolute paths anywhere in the command
      const absPathRegex = /(?:^|\s)(\/[^\s;&|]+)/g;
      let match;
      while ((match = absPathRegex.exec(command)) !== null) {
        const p = match[1].trim();
        if (path.isAbsolute(p) && !p.startsWith(rootPath)) {
           return `Unauthorized access to absolute path outside repository: ${p}`;
        }
      }
    }

    return null;
  }
}
