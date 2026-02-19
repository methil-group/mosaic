import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

export interface AgentRecord {
    id: string
    name: string
    workspace: string
    model: string
    provider: string
    is_visible: boolean | number
    color?: string | null
    icon?: string | null
    description?: string | null
    video?: string | null
    lottie?: string | null
    desktop_id?: string | null
    created_at?: string
}

export interface DesktopRecord {
    id: string
    name: string
    color?: string | null
    path: string
    created_at?: string
}

export interface MessageRecord {
    id: number
    agent_id: string
    role: string
    content: string
    model?: string | null
    events?: string | null
    created_at: string
}

export class DbService {
    private db: Database.Database

    constructor(dbPath?: string) {
        const resolvedPath = dbPath || path.join(app.getPath('userData'), 'mosaic.sqlite')
        const dir = path.dirname(resolvedPath)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

        this.db = new Database(resolvedPath)
        this.db.pragma('journal_mode = WAL')
        this.db.pragma('synchronous = NORMAL')
        this.init()
    }

    private init(): void {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `)

        this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        workspace TEXT DEFAULT '',
        model TEXT NOT NULL,
        provider TEXT NOT NULL DEFAULT 'openrouter',
        is_visible INTEGER DEFAULT 1,
        color TEXT,
        icon TEXT,
        description TEXT,
        video TEXT,
        lottie TEXT,
        desktop_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)

        this.db.exec(`
      CREATE TABLE IF NOT EXISTS desktops (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT,
        path TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)

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
    `)
    }

    // Settings
    getSetting(key: string): string | null {
        const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any
        return row?.value ?? null
    }

    setSetting(key: string, value: string): void {
        this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
    }

    // Agents
    getAgents(): AgentRecord[] {
        return this.db.prepare(`
      SELECT id, name, workspace, model, provider, is_visible, color, icon, description, video, lottie, desktop_id, created_at
      FROM agents ORDER BY created_at DESC
    `).all() as AgentRecord[]
    }

    getAgent(id: string): AgentRecord | undefined {
        return this.db.prepare(`
      SELECT id, name, workspace, model, provider, is_visible, color, icon, description, video, lottie, desktop_id, created_at
      FROM agents WHERE id = ?
    `).get(id) as AgentRecord | undefined
    }

    saveAgent(agent: AgentRecord): void {
        this.db.prepare(`
      INSERT OR REPLACE INTO agents
      (id, name, workspace, model, provider, is_visible, color, icon, description, video, lottie, desktop_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM agents WHERE id = ?), CURRENT_TIMESTAMP))
    `).run(
            agent.id, agent.name, agent.workspace || '', agent.model || '', agent.provider || 'openrouter',
            agent.is_visible ? 1 : 0, agent.color || null, agent.icon || null, agent.description || null,
            agent.video || null, agent.lottie || null, agent.desktop_id || null, agent.id
        )
    }

    deleteAgent(id: string): void {
        this.db.prepare('DELETE FROM messages WHERE agent_id = ?').run(id)
        this.db.prepare('DELETE FROM agents WHERE id = ?').run(id)
    }

    updateAgentVisibility(id: string, isVisible: boolean): void {
        this.db.prepare('UPDATE agents SET is_visible = ? WHERE id = ?').run(isVisible ? 1 : 0, id)
    }

    // Desktops
    getDesktops(): DesktopRecord[] {
        return this.db.prepare('SELECT id, name, color, path, created_at FROM desktops ORDER BY created_at DESC').all() as DesktopRecord[]
    }

    saveDesktop(desktop: DesktopRecord): void {
        this.db.prepare(`
      INSERT OR REPLACE INTO desktops (id, name, color, path, created_at)
      VALUES (?, ?, ?, ?, COALESCE((SELECT created_at FROM desktops WHERE id = ?), CURRENT_TIMESTAMP))
    `).run(desktop.id, desktop.name, desktop.color || null, desktop.path || '', desktop.id)
    }

    deleteDesktop(id: string): void {
        this.db.prepare('DELETE FROM desktops WHERE id = ?').run(id)
    }

    // Messages
    getMessages(agentId: string): MessageRecord[] {
        return this.db.prepare(
            'SELECT id, agent_id, role, content, model, events, created_at FROM messages WHERE agent_id = ? ORDER BY id ASC'
        ).all(agentId) as MessageRecord[]
    }

    addMessage(agentId: string, role: string, content: string, model?: string | null): { id: number } {
        const result = this.db.prepare(
            'INSERT INTO messages (agent_id, role, content, model) VALUES (?, ?, ?, ?)'
        ).run(agentId, role, content, model || null)
        return { id: Number(result.lastInsertRowid) }
    }

    updateMessage(id: number, content: string, events?: string | null): void {
        this.db.prepare('UPDATE messages SET content = ?, events = ? WHERE id = ?').run(content, events || null, id)
    }

    clearMessagesForAgent(agentId: string): void {
        this.db.prepare('DELETE FROM messages WHERE agent_id = ?').run(agentId)
    }

    resetDatabase(): void {
        this.db.exec('DROP TABLE IF EXISTS messages')
        this.db.exec('DROP TABLE IF EXISTS desktops')
        this.db.exec('DROP TABLE IF EXISTS agents')
        this.db.exec('DROP TABLE IF EXISTS settings')
        this.init()
    }
}
