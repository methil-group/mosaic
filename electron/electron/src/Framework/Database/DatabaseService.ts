import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

export interface AgentRecord {
  id: string;
  name: string;
  workspace: string;
  model: string;
  is_visible: number;
  color?: string;
  icon?: string;
  description?: string;
  desktop_id: string;
  created_at: string;
}

export interface DesktopRecord {
  id: string;
  name: string;
  color?: string;
  created_at: string;
}

export interface MessageRecord {
  id: number;
  agent_id: string;
  role: string;
  content: string;
  model?: string;
  created_at: string;
}

export class DatabaseService {
  private db: Database.Database;

  constructor() {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'mosaic.sqlite');

    // Ensure the directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.init();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        workspace TEXT DEFAULT '',
        model TEXT NOT NULL,
        is_visible INTEGER DEFAULT 1,
        color TEXT,
        icon TEXT,
        description TEXT,
        video TEXT,
        lottie TEXT,
        desktop_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS desktops (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure at least one desktop exists
    const defaultDesktop = this.db.prepare('SELECT id FROM desktops WHERE id = ?').get('default');
    if (!defaultDesktop) {
      this.db.prepare('INSERT INTO desktops (id, name, color) VALUES (?, ?, ?)').run('default', 'Main Desktop', '#6366f1');
    }

    // Migration: Add missing columns if they don't exist
    try {
      const tableInfo = this.db.prepare('PRAGMA table_info(agents)').all() as any[];
      const columns = tableInfo.map(c => c.name);

      if (!columns.includes('color')) {
        this.db.prepare('ALTER TABLE agents ADD COLUMN color TEXT').run();
      }
      if (!columns.includes('icon')) {
        this.db.prepare('ALTER TABLE agents ADD COLUMN icon TEXT').run();
      }
      if (!columns.includes('description')) {
        this.db.prepare('ALTER TABLE agents ADD COLUMN description TEXT').run();
      }
      if (!columns.includes('video')) {
        this.db.prepare('ALTER TABLE agents ADD COLUMN video TEXT').run();
      }
      if (!columns.includes('lottie')) {
        this.db.prepare('ALTER TABLE agents ADD COLUMN lottie TEXT').run();
      }
      if (!columns.includes('desktop_id')) {
        this.db.prepare('ALTER TABLE agents ADD COLUMN desktop_id TEXT').run();
        // Move all existing agents to default desktop
        this.db.prepare('UPDATE agents SET desktop_id = ?').run('default');
      }
    } catch (error) {
      console.error('Failed to migrate agents table:', error);
    }

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        model TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
      )
    `);
  }

  // Settings methods
  public getSetting(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row ? row.value : null;
  }

  public setSetting(key: string, value: string): void {
    this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
  }

  public deleteSetting(key: string): void {
    this.db.prepare('DELETE FROM settings WHERE key = ?').run(key);
  }

  // Agent methods
  public getAgents(): AgentRecord[] {
    return this.db.prepare('SELECT * FROM agents ORDER BY created_at DESC').all() as AgentRecord[];
  }

  public getAgent(id: string): AgentRecord | null {
    const row = this.db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as AgentRecord | undefined;
    return row || null;
  }

  public saveAgent(agent: { id: string; name: string; workspace: string; model: string; is_visible?: boolean; color?: string; icon?: string; description?: string; video?: string; lottie?: string; desktop_id?: string }): void {
    const isVisible = agent.is_visible !== undefined ? (agent.is_visible ? 1 : 0) : 1;
    this.db.prepare(`
      INSERT OR REPLACE INTO agents (id, name, workspace, model, is_visible, color, icon, description, video, lottie, desktop_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM agents WHERE id = ?), CURRENT_TIMESTAMP))
    `).run(agent.id, agent.name, agent.workspace, agent.model, isVisible, agent.color || null, agent.icon || null, agent.description || null, agent.video || null, agent.lottie || null, agent.desktop_id || 'default', agent.id);
  }

  // Desktop methods
  public getDesktops(): DesktopRecord[] {
    return this.db.prepare('SELECT * FROM desktops ORDER BY created_at ASC').all() as DesktopRecord[];
  }

  public getDesktop(id: string): DesktopRecord | null {
    const row = this.db.prepare('SELECT * FROM desktops WHERE id = ?').get(id) as DesktopRecord | undefined;
    return row || null;
  }

  public saveDesktop(desktop: { id: string; name: string; color?: string }): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO desktops (id, name, color, created_at)
      VALUES (?, ?, ?, COALESCE((SELECT created_at FROM desktops WHERE id = ?), CURRENT_TIMESTAMP))
    `).run(desktop.id, desktop.name, desktop.color || null, desktop.id);
  }

  public deleteDesktop(id: string): void {
    // We might want to move agents to default or delete them. 
    // For now, let's keep them and mark them as without desktop (or move to default)
    this.db.prepare('UPDATE agents SET desktop_id = ? WHERE desktop_id = ?').run('default', id);
    this.db.prepare('DELETE FROM desktops WHERE id = ?').run(id);
  }

  public updateAgentVisibility(id: string, isVisible: boolean): void {
    this.db.prepare('UPDATE agents SET is_visible = ? WHERE id = ?').run(isVisible ? 1 : 0, id);
  }

  public deleteAgent(id: string): void {
    this.db.prepare('DELETE FROM agents WHERE id = ?').run(id);
  }

  // Message methods
  public getMessages(agentId: string): MessageRecord[] {
    return this.db.prepare('SELECT * FROM messages WHERE agent_id = ? ORDER BY created_at ASC').all(agentId) as MessageRecord[];
  }

  public addMessage(agentId: string, role: string, content: string, model?: string): number {
    const result = this.db.prepare('INSERT INTO messages (agent_id, role, content, model) VALUES (?, ?, ?, ?)').run(agentId, role, content, model || null);
    return result.lastInsertRowid as number;
  }

  public updateMessage(id: number, content: string): void {
    this.db.prepare('UPDATE messages SET content = ? WHERE id = ?').run(content, id);
  }

  public deleteMessagesForAgent(agentId: string): void {
    this.db.prepare('DELETE FROM messages WHERE agent_id = ?').run(agentId);
  }

  public close() {
    this.db.close();
  }
}

