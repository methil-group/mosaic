use serde::{Deserialize, Serialize};
use sqlx::{sqlite::SqlitePool, Row};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AgentRecord {
    pub id: String,
    pub name: String,
    pub workspace: String,
    pub model: String,
    pub is_visible: bool,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub description: Option<String>,
    pub video: Option<String>,
    pub lottie: Option<String>,
    pub desktop_id: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DesktopRecord {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub path: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MessageRecord {
    pub id: i64,
    pub agent_id: String,
    pub role: String,
    pub content: String,
    pub model: Option<String>,
    pub events: Option<String>,
    pub created_at: String,
}

pub struct DbService {
    pool: SqlitePool,
}

impl DbService {
    pub async fn new(db_path: PathBuf) -> Result<Self, String> {
        let db_str = db_path.to_str().ok_or("Invalid path")?.to_string();
        println!("[DbService] Initializing database at: {}", db_str);

        let options = sqlx::sqlite::SqliteConnectOptions::new()
            .filename(db_path)
            .create_if_missing(true);
        
        let pool = SqlitePool::connect_with(options).await.map_err(|e| {
            format!("Failed to connect to SQLite at {}: {}", db_str, e)
        })?;
        
        let service = Self { pool };
        service.init().await?;
        
        Ok(service)
    }

    async fn init(&self) -> Result<(), String> {
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )"
        ).execute(&self.pool).await.map_err(|e| e.to_string())?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS agents (
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
            )"
        ).execute(&self.pool).await.map_err(|e| e.to_string())?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS desktops (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                color TEXT,
                path TEXT DEFAULT '',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )"
        ).execute(&self.pool).await.map_err(|e| e.to_string())?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                model TEXT,
                events TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
            )"
        ).execute(&self.pool).await.map_err(|e| e.to_string())?;

        Ok(())
    }

    // Settings
    pub async fn get_setting(&self, key: &str) -> Result<Option<String>, String> {
        let row = sqlx::query("SELECT value FROM settings WHERE key = ?")
            .bind(key)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| e.to_string())?;
            
        Ok(row.map(|r| r.get("value")))
    }

    pub async fn set_setting(&self, key: &str, value: &str) -> Result<(), String> {
        sqlx::query("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
            .bind(key)
            .bind(value)
            .execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    // Agents
    pub async fn get_agents(&self) -> Result<Vec<AgentRecord>, String> {
        let rows = sqlx::query("SELECT 
                id, name, workspace, model, 
                is_visible != 0 as is_visible, 
                color, icon, description, video, lottie, desktop_id, created_at 
            FROM agents ORDER BY created_at DESC")
        .fetch_all(&self.pool)
        .await
        .map_err(|e| e.to_string())?
        .into_iter()
        .map(|r| AgentRecord {
            id: r.get("id"),
            name: r.get("name"),
            workspace: r.get("workspace"),
            model: r.get("model"),
            is_visible: r.get::<i32, _>("is_visible") != 0,
            color: r.get("color"),
            icon: r.get("icon"),
            description: r.get("description"),
            video: r.get("video"),
            lottie: r.get("lottie"),
            desktop_id: r.get("desktop_id"),
            created_at: r.get("created_at"),
        })
        .collect();
        
        Ok(rows)
    }

    pub async fn save_agent(&self, agent: AgentRecord) -> Result<(), String> {
        sqlx::query(
            "INSERT OR REPLACE INTO agents 
            (id, name, workspace, model, is_visible, color, icon, description, video, lottie, desktop_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM agents WHERE id = ?), CURRENT_TIMESTAMP))"
        )
        .bind(&agent.id)
        .bind(&agent.name)
        .bind(&agent.workspace)
        .bind(&agent.model)
        .bind(agent.is_visible as i32)
        .bind(&agent.color)
        .bind(&agent.icon)
        .bind(&agent.description)
        .bind(&agent.video)
        .bind(&agent.lottie)
        .bind(&agent.desktop_id)
        .bind(&agent.id)
        .execute(&self.pool)
        .await
        .map_err(|e| e.to_string())?;
        
        Ok(())
    }

    pub async fn delete_agent(&self, id: &str) -> Result<(), String> {
        sqlx::query("DELETE FROM agents WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub async fn update_agent_visibility(&self, id: &str, is_visible: bool) -> Result<(), String> {
        sqlx::query("UPDATE agents SET is_visible = ? WHERE id = ?")
            .bind(is_visible as i32)
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    // Desktops
    pub async fn get_desktops(&self) -> Result<Vec<DesktopRecord>, String> {
        let rows = sqlx::query("SELECT id, name, color, path, created_at FROM desktops ORDER BY created_at DESC")
        .fetch_all(&self.pool)
        .await
        .map_err(|e| e.to_string())?
        .into_iter()
        .map(|r| DesktopRecord {
            id: r.get("id"),
            name: r.get("name"),
            color: r.get("color"),
            path: r.get("path"),
            created_at: r.get("created_at"),
        })
        .collect();
        Ok(rows)
    }

    pub async fn save_desktop(&self, desktop: DesktopRecord) -> Result<(), String> {
        sqlx::query(
            "INSERT OR REPLACE INTO desktops (id, name, color, path, created_at) 
             VALUES (?, ?, ?, ?, COALESCE((SELECT created_at FROM desktops WHERE id = ?), CURRENT_TIMESTAMP))"
        )
        .bind(&desktop.id)
        .bind(&desktop.name)
        .bind(&desktop.color)
        .bind(&desktop.path)
        .bind(&desktop.id)
        .execute(&self.pool)
        .await
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub async fn delete_desktop(&self, id: &str) -> Result<(), String> {
        sqlx::query("DELETE FROM desktops WHERE id = ?").bind(id).execute(&self.pool).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    // Messages
    pub async fn get_messages(&self, agent_id: &str) -> Result<Vec<MessageRecord>, String> {
        let rows = sqlx::query("SELECT id, agent_id, role, content, model, events, created_at FROM messages WHERE agent_id = ? ORDER BY id ASC")
        .bind(agent_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| e.to_string())?
        .into_iter()
        .map(|r| MessageRecord {
            id: r.get("id"),
            agent_id: r.get("agent_id"),
            role: r.get("role"),
            content: r.get("content"),
            model: r.get("model"),
            events: r.get("events"),
            created_at: r.get("created_at"),
        })
        .collect();
        Ok(rows)
    }

    pub async fn add_message(&self, agent_id: &str, role: &str, content: &str, model: Option<String>) -> Result<i64, String> {
        let result = sqlx::query(
            "INSERT INTO messages (agent_id, role, content, model) VALUES (?, ?, ?, ?)"
        )
        .bind(agent_id)
        .bind(role)
        .bind(content)
        .bind(model)
        .execute(&self.pool)
        .await
        .map_err(|e| e.to_string())?;
        
        Ok(result.last_insert_rowid())
    }

    pub async fn update_message(&self, id: i64, content: &str, events: Option<String>) -> Result<(), String> {
        sqlx::query(
            "UPDATE messages SET content = ?, events = ? WHERE id = ?"
        )
        .bind(content)
        .bind(events)
        .bind(id)
        .execute(&self.pool)
        .await
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub async fn clear_messages_for_agent(&self, agent_id: &str) -> Result<(), String> {
        sqlx::query("DELETE FROM messages WHERE agent_id = ?")
            .bind(agent_id)
            .execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;
        sqlx::query("PRAGMA journal_mode = WAL").execute(&self.pool).await.map_err(|e| e.to_string())?;
        sqlx::query("PRAGMA synchronous = NORMAL").execute(&self.pool).await.map_err(|e| e.to_string())?;

        Ok(())
    }

    pub async fn reset_database(&self) -> Result<(), String> {
        sqlx::query("DROP TABLE IF EXISTS messages").execute(&self.pool).await.map_err(|e| e.to_string())?;
        sqlx::query("DROP TABLE IF EXISTS desktops").execute(&self.pool).await.map_err(|e| e.to_string())?;
        sqlx::query("DROP TABLE IF EXISTS agents").execute(&self.pool).await.map_err(|e| e.to_string())?;
        sqlx::query("DROP TABLE IF EXISTS settings").execute(&self.pool).await.map_err(|e| e.to_string())?;
        
        self.init().await?;
        Ok(())
    }
}

