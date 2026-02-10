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
  path: string;
  created_at: string;
}

export interface MessageRecord {
  id: number;
  agent_id: string;
  role: string;
  content: string;
  model?: string;
  events?: string; // JSON string
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

  public getDatabasePath(): string {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'mosaic.sqlite');
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
        path TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);


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
      }

      // Migration for desktops
      const desktopTableInfo = this.db.prepare('PRAGMA table_info(desktops)').all() as any[];
      const desktopColumns = desktopTableInfo.map(c => c.name);
      if (!desktopColumns.includes('path')) {
        this.db.prepare('ALTER TABLE desktops ADD COLUMN path TEXT DEFAULT ""').run();
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
        events TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
      )
    `);

    // Migration for messages table
    try {
      const messageTableInfo = this.db.prepare('PRAGMA table_info(messages)').all() as any[];
      const messageColumns = messageTableInfo.map(c => c.name);
      if (!messageColumns.includes('events')) {
        this.db.prepare('ALTER TABLE messages ADD COLUMN events TEXT').run();
      }
    } catch (error) {
      console.error('Failed to migrate messages table:', error);
    }
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
    `).run(agent.id, agent.name, agent.workspace, agent.model, isVisible, agent.color || null, agent.icon || null, agent.description || null, agent.video || null, agent.lottie || null, agent.desktop_id || null, agent.id);
  }

  // Desktop methods
  public getDesktops(): DesktopRecord[] {
    return this.db.prepare('SELECT * FROM desktops ORDER BY created_at ASC').all() as DesktopRecord[];
  }

  public getDesktop(id: string): DesktopRecord | null {
    const row = this.db.prepare('SELECT * FROM desktops WHERE id = ?').get(id) as DesktopRecord | undefined;
    return row || null;
  }

  public saveDesktop(desktop: { id: string; name: string; color?: string; path?: string }): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO desktops (id, name, color, path, created_at)
      VALUES (?, ?, ?, ?, COALESCE((SELECT created_at FROM desktops WHERE id = ?), CURRENT_TIMESTAMP))
    `).run(desktop.id, desktop.name, desktop.color || null, desktop.path || '', desktop.id);
  }

  public deleteDesktop(id: string): void {
    // For now, let's keep them and mark them as without desktop
    this.db.prepare('UPDATE agents SET desktop_id = ? WHERE desktop_id = ?').run(null, id);
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

  public addMessage(agentId: string, role: string, content: string, model?: string, events?: string): number {
    const result = this.db.prepare('INSERT INTO messages (agent_id, role, content, model, events) VALUES (?, ?, ?, ?, ?)').run(agentId, role, content, model || null, events || null);
    return result.lastInsertRowid as number;
  }

  public updateMessage(id: number, content: string, events?: string): void {
    if (events !== undefined) {
      this.db.prepare('UPDATE messages SET content = ?, events = ? WHERE id = ?').run(content, events, id);
    } else {
      this.db.prepare('UPDATE messages SET content = ? WHERE id = ?').run(content, id);
    }
  }

  public deleteMessagesForAgent(agentId: string): void {
    this.db.prepare('DELETE FROM messages WHERE agent_id = ?').run(agentId);
  }

  public close() {
    this.db.close();
  }
}

