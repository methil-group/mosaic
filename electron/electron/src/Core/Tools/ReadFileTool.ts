import * as fs from 'node:fs/promises';
import { join } from 'node:path';
import { Tool } from './Tool';

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
    const expandedPath = this.expandPath(params.path);
    const expandedWorkspace = this.expandPath(workspace);
    
    // Determine the path to read. If expandedPath is absolute, use it.
    // Otherwise, join it with the workspace.
    const absolutePath = (expandedPath.startsWith('/') || expandedPath.includes(':')) 
      ? expandedPath 
      : join(expandedWorkspace, expandedPath);

    try {
      return await fs.readFile(absolutePath, 'utf8');
    } catch (error: any) {
      return `Error reading file: ${error.message} (Attempted path: ${absolutePath})`;
    }
  }
}
