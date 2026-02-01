import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import { join, dirname } from 'path';
import * as os from 'os';

const execPromise = promisify(exec);

export interface ToolParameters {
  [key: string]: any;
}

export abstract class Tool {
  abstract name: string;
  abstract description: string;
  abstract parameters: string; // JSON Schema string
  
  abstract execute(params: ToolParameters, workspace: string): Promise<string>;

  protected expandPath(path: string): string {
    if (path.startsWith('~/')) {
      return join(os.homedir(), path.slice(2));
    }
    if (path === '~') {
      return os.homedir();
    }
    return path;
  }
}

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

export class ReadFileTool extends Tool {
  name = 'read_file';
  description = 'Read the contents of a file at the given path.';
  parameters = JSON.stringify({
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to the file to read.' }
    },
    required: ['path']
  });

  async execute(params: { path: string }, workspace: string): Promise<string> {
    const fullPath = this.expandPath(params.path);
    const absolutePath = join(this.expandPath(workspace), fullPath);
    try {
      return await fs.readFile(absolutePath, 'utf8');
    } catch (error: any) {
      return `Error reading file: ${error.message}`;
    }
  }
}

export class WriteFileTool extends Tool {
  name = 'write_file';
  description = 'Write content to a file. Warning: This overwrites existing content.';
  parameters = JSON.stringify({
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path where the file will be written.' },
      content: { type: 'string', description: 'The content to write to the file.' }
    },
    required: ['path', 'content']
  });

  async execute(params: { path: string, content: string }, workspace: string): Promise<string> {
    const fullPath = this.expandPath(params.path);
    const absolutePath = join(this.expandPath(workspace), fullPath);
    try {
      await fs.mkdir(dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, params.content, 'utf8');
      return 'File written successfully';
    } catch (error: any) {
      return `Error writing file: ${error.message}`;
    }
  }
}

export class ReplaceContentTool extends Tool {
  name = 'replace_content';
  description = 'Replace occurrences of old text with new text in a file.';
  parameters = JSON.stringify({
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to the file to modify.' },
      old_text: { type: 'string', description: 'The text to be replaced.' },
      new_text: { type: 'string', description: 'The text to replace with.' }
    },
    required: ['path', 'old_text', 'new_text']
  });

  async execute(params: { path: string, old_text: string, new_text: string }, workspace: string): Promise<string> {
    const absolutePath = join(this.expandPath(workspace), this.expandPath(params.path));
    try {
      const content = await fs.readFile(absolutePath, 'utf8');
      const newContent = content.split(params.old_text).join(params.new_text);
      if (content === newContent) {
        return 'Warning: Old text not found in file.';
      }
      await fs.writeFile(absolutePath, newContent, 'utf8');
      return 'Content replaced successfully';
    } catch (error: any) {
      return `Error replacing content: ${error.message}`;
    }
  }
}

export class InsertLineTool extends Tool {
  name = 'insert_line';
  description = 'Insert a single line of text at a specific line number (1-indexed).';
  parameters = JSON.stringify({
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to the file to modify.' },
      line: { type: 'integer', description: 'The line number (1-indexed) where content will be inserted.' },
      content: { type: 'string', description: 'The text to insert.' }
    },
    required: ['path', 'line', 'content']
  });

  async execute(params: { path: string, line: number, content: string }, workspace: string): Promise<string> {
    const absolutePath = join(this.expandPath(workspace), this.expandPath(params.path));
    try {
      const content = await fs.readFile(absolutePath, 'utf8');
      const lines = content.split('\n');
      const index = Math.max(0, params.line - 1);
      lines.splice(index, 0, params.content);
      await fs.writeFile(absolutePath, lines.join('\n'), 'utf8');
      return 'Line inserted successfully';
    } catch (error: any) {
      return `Error inserting line: ${error.message}`;
    }
  }
}

export class ManageTodosTool extends Tool {
  name = 'manage_todos';
  description = 'Manage a list of todo items. Use this to track progress on multi-step tasks. Provide a conclusion once the task is finished.';
  parameters = JSON.stringify({
    type: 'object',
    properties: {
      todos: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            task: { type: 'string', description: 'Description of the task.' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed'], description: 'Status of the task.' },
            context: { type: 'string', description: 'Active form context (required for in_progress tasks, empty otherwise).' }
          },
          required: ['task', 'status', 'context']
        }
      },
      conclusion: { type: 'string', description: 'Optional final comment or summary of completed work.' }
    },
    required: ['todos']
  });

  // Just return the string representation for the UI to parse, similar to Gleam backend
  async execute(params: any, _workspace: string): Promise<string> {
    return JSON.stringify(params);
  }
}

export function getTools(): Tool[] {
  return [
    new BashTool(),
    new ReadFileTool(),
    new WriteFileTool(),
    new ReplaceContentTool(),
    new InsertLineTool(),
    new ManageTodosTool()
  ];
}
