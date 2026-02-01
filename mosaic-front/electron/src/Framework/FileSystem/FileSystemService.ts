import * as fs from 'node:fs/promises';
import { join } from 'node:path';
import * as os from 'node:os';

export class FileSystemService {
  private expandPath(path: string): string {
    if (path.startsWith('~/')) {
      return join(os.homedir(), path.slice(2));
    }
    if (path === '~') {
      return os.homedir();
    }
    return path;
  }

  async listDirectories(path: string): Promise<string[]> {
    const fullPath = this.expandPath(path);
    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      return entries
        .filter(e => e.isDirectory())
        .map(e => e.name);
    } catch (e) {
      console.error('Failed to list directories', e);
      return [];
    }
  }

  async listFiles(path: string): Promise<string[]> {
    const fullPath = this.expandPath(path);
    try {
      const files: string[] = [];
      await this.listFilesRecursive(fullPath, '', files);
      return files;
    } catch (e) {
      console.error('Failed to list files', e);
      return [];
    }
  }

  private async listFilesRecursive(baseDir: string, relativePath: string, result: string[]): Promise<void> {
    const fullDir = join(baseDir, relativePath);
    try {
      const entries = await fs.readdir(fullDir, { withFileTypes: true });
      for (const entry of entries) {
        const rel = join(relativePath, entry.name);
        
        const isHidden = entry.name.startsWith('.');
        const isIgnored = ["node_modules", ".git", "build", "dist", "_build", "deps"].includes(entry.name);
        
        if (isHidden || isIgnored) continue;

        if (entry.isDirectory()) {
          await this.listFilesRecursive(baseDir, rel, result);
        } else {
          result.push(rel);
        }
      }
    } catch (e) {
      // Ignore errors for individual directories
    }
  }
}
