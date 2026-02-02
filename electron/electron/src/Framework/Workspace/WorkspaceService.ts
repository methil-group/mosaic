import * as fs from 'node:fs/promises';
import { join } from 'node:path';
import * as os from 'node:os';

export interface Workspace {
  id: string;
  name: string;
  path: string;
  description?: string;
  color?: string;
}

export class WorkspaceService {
  private configPath: string;

  constructor() {
    this.configPath = join(os.homedir(), '.mosaic', 'workspaces.json');
  }

  private async ensureDir() {
    await fs.mkdir(join(os.homedir(), '.mosaic'), { recursive: true });
  }

  async getWorkspaces(): Promise<Workspace[]> {
    try {
      await this.ensureDir();
      const content = await fs.readFile(this.configPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      return [];
    }
  }

  async saveWorkspace(workspace: Workspace): Promise<void> {
    const workspaces = await this.getWorkspaces();
    const index = workspaces.findIndex(w => w.id === workspace.id);
    if (index !== -1) {
      workspaces[index] = workspace;
    } else {
      workspaces.push(workspace);
    }
    await this.ensureDir();
    await fs.writeFile(this.configPath, JSON.stringify(workspaces, null, 2), 'utf8');
  }

  async deleteWorkspace(id: string): Promise<void> {
    const workspaces = await this.getWorkspaces();
    const filtered = workspaces.filter(w => w.id !== id);
    await this.ensureDir();
    await fs.writeFile(this.configPath, JSON.stringify(filtered, null, 2), 'utf8');
  }
}
