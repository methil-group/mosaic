import * as fs from 'node:fs/promises';
import { join } from 'node:path';
import { Tool } from './Tool';

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
