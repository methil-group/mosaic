import { join } from 'node:path';
import * as os from 'node:os';

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
