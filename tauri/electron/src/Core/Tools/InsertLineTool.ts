import * as fs from 'node:fs/promises';
import { join } from 'node:path';
import { Tool } from './Tool';

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
