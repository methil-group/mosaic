import * as fs from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { Tool } from './Tool';

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
