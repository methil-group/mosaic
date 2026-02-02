import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { Tool } from './Tool';

const execPromise = promisify(exec);

export class BashTool extends Tool {
  name = 'run_bash';
  description = 'Run a shell command. Use for: ls, find, grep, git, npm, python, etc.';
  parameters = JSON.stringify({
    type: 'object',
    properties: {
      command: { type: 'string', description: 'The bash command to run.' }
    },
    required: ['command']
  });

  async execute(params: { command: string }, workspace: string): Promise<string> {
    const fullWorkspace = this.expandPath(workspace);
    try {
      const { stdout, stderr } = await execPromise(params.command, { cwd: fullWorkspace });
      return stdout + (stderr ? `\nError output:\n${stderr}` : '');
    } catch (error: any) {
      return `Execution failed: ${error.message}${error.stdout ? `\nOutput before failure:\n${error.stdout}` : ''}`;
    }
  }
}
