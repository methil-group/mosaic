// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
mod llm;
mod core;
mod framework;
mod state;

use state::AppState;
use tauri::{Manager, State, AppHandle, Emitter};
use crate::llm::LlmProvider;
use std::sync::Arc;

#[tauri::command]
async fn ping() -> String {
    "pong".to_string()
}

#[tauri::command]
async fn get_agents(state: State<'_, Arc<AppState>>) -> Result<Vec<db::AgentRecord>, String> {
    state.db.get_agents().await
}

#[tauri::command]
async fn agent_stream(
    app: AppHandle,
    state: State<'_, Arc<AppState>>,
    instance_id: String,
    model_id: String,
    user_prompt: String,
    workspace: String,
    user_name: String,
    history: Vec<crate::llm::Message>,
    persona: Option<String>,
) -> Result<(), String> {
    // 1. Determine provider (simple routing for now)
    let provider = if model_id.contains("/") {
        state.llm.clone()
    } else {
        state.lm_studio.clone() as Arc<dyn crate::llm::LlmProvider>
    };

    // 2. Create agent
    let agent = Arc::new(core::agent::Agent::new(
        provider,
        model_id,
        workspace,
        user_name,
        core::tools::get_default_tools(),
    ));

    // 3. Store agent
    {
        let mut active = state.active_agents.lock().await;
        active.insert(instance_id.clone(), agent.clone());
    }

    // 4. Run agent
    let id_clone = instance_id.clone();
    let app_clone = app.clone();
    
    agent.run(user_prompt, history, persona, move |event| {
        let payload = serde_json::json!({
            "instanceId": id_clone,
            "event": event
        });
        let _ = app_clone.emit("agent-event", payload);
    }).await?;

    // 5. Cleanup
    {
        let mut active = state.active_agents.lock().await;
        active.remove(&instance_id);
    }

    Ok(())
}

#[tauri::command]
async fn stop_agent(state: State<'_, Arc<AppState>>, instance_id: String) -> Result<bool, String> {
    let mut active = state.active_agents.lock().await;
    if let Some(agent) = active.remove(&instance_id) {
        agent.stop().await;
        Ok(true)
    } else {
        Ok(false)
    }
}


#[tauri::command]
async fn agents_save(
    state: State<'_, Arc<AppState>>, 
    id: String, 
    name: String, 
    workspace: String, 
    model: String, 
    is_visible: bool, 
    color: Option<String>, 
    icon: Option<String>, 
    description: Option<String>, 
    desktop_id: Option<String>,
    video: Option<String>,
    lottie: Option<String>
) -> Result<(), String> {
    state.db.save_agent(db::AgentRecord {
        id, name, workspace, model, is_visible, color, icon, description, desktop_id,
        video, lottie, created_at: "".to_string()
    }).await
}

#[tauri::command]
async fn agents_delete(state: State<'_, Arc<AppState>>, id: String) -> Result<(), String> {
    state.db.delete_agent(&id).await
}

#[tauri::command]
async fn agents_update_visibility(state: State<'_, Arc<AppState>>, id: String, is_visible: bool) -> Result<(), String> {
    state.db.update_agent_visibility(&id, is_visible).await
}

#[tauri::command]
async fn messages_list(state: State<'_, Arc<AppState>>, agent_id: String) -> Result<Vec<db::MessageRecord>, String> {
    state.db.get_messages(&agent_id).await
}

#[tauri::command]
async fn messages_add(state: State<'_, Arc<AppState>>, agent_id: String, role: String, content: String, model: Option<String>) -> Result<serde_json::Value, String> {
    let id = state.db.add_message(&agent_id, &role, &content, model).await?;
    Ok(serde_json::json!({ "id": id }))
}

#[tauri::command]
async fn messages_update(state: State<'_, Arc<AppState>>, id: i64, content: String, events: Option<String>) -> Result<(), String> {
    state.db.update_message(id, &content, events).await
}

#[tauri::command]
async fn messages_clear_for_agent(state: State<'_, Arc<AppState>>, instance_id: String) -> Result<(), String> {
    state.db.clear_messages_for_agent(&instance_id).await
}

#[tauri::command]
async fn desktops_list(state: State<'_, Arc<AppState>>) -> Result<Vec<db::DesktopRecord>, String> {
    state.db.get_desktops().await
}

#[tauri::command]
async fn desktops_save(state: State<'_, Arc<AppState>>, id: String, name: String, color: Option<String>, path: String) -> Result<(), String> {
    state.db.save_desktop(db::DesktopRecord {
        id, name, color, path, created_at: "".to_string()
    }).await
}

#[tauri::command]
async fn desktops_delete(state: State<'_, Arc<AppState>>, id: String) -> Result<(), String> {
    state.db.delete_desktop(&id).await
}

#[tauri::command]
async fn settings_get(state: State<'_, Arc<AppState>>, key: String) -> Result<Option<String>, String> {
    state.db.get_setting(&key).await
}

#[tauri::command]
async fn settings_set(state: State<'_, Arc<AppState>>, key: String, value: String) -> Result<(), String> {
    state.db.set_setting(&key, &value).await
}

#[tauri::command]
async fn providers_get(state: State<'_, Arc<AppState>>) -> Result<serde_json::Value, String> {
    // Ported logic from Electron main.ts
    let lm_studio_models = state.lm_studio.fetch_models().await.unwrap_or_default();
    
    Ok(serde_json::json!({
        "providers": [
            {
                "id": "openrouter",
                "name": "OpenRouter",
                "models": [ 
                    { "id": "qwen/qwen3-coder-next", "name": "Qwen 3 Coder" },
                    { "id": "anthropic/claude-3.5-sonnet", "name": "Claude 3.5 Sonnet" }
                ]
            },
            {
                "id": "lmstudio",
                "name": "LM Studio (Local)",
                "models": lm_studio_models.iter().map(|m| serde_json::json!({ "id": m, "name": m })).collect::<Vec<_>>()
            }
        ]
    }))
}

#[tauri::command]
async fn list_directories(app: AppHandle, path: String) -> Result<serde_json::Value, String> {
    let resolved_path = if path == "~" || path.starts_with("~/") {
        let home = app.path().home_dir().map_err(|e| e.to_string())?;
        if path == "~" {
            home.to_string_lossy().to_string()
        } else {
            home.join(&path[2..]).to_string_lossy().to_string()
        }
    } else {
        path
    };

    let dirs = framework::fs::FileSystemService::list_directories(&resolved_path)?;
    Ok(serde_json::json!({ "directories": dirs }))
}
#[tauri::command]
async fn fetch_files(app: AppHandle, path: String) -> Result<serde_json::Value, String> {
    let resolved_path = if path == "~" || path.starts_with("~/") {
        let home = app.path().home_dir().map_err(|e| e.to_string())?;
        if path == "~" {
            home.to_string_lossy().to_string()
        } else {
            home.join(&path[2..]).to_string_lossy().to_string()
        }
    } else {
        path
    };

    let files = framework::fs::FileSystemService::list_files(&resolved_path)?;
    Ok(serde_json::json!({ "files": files }))
}

#[tauri::command]
async fn create_directory(app: AppHandle, path: String, name: String) -> Result<(), String> {
    let resolved_path = if path == "~" || path.starts_with("~/") {
        let home = app.path().home_dir().map_err(|e| e.to_string())?;
        if path == "~" {
            home.to_string_lossy().to_string()
        } else {
            home.join(&path[2..]).to_string_lossy().to_string()
        }
    } else {
        path
    };

    framework::fs::FileSystemService::create_directory(&resolved_path, &name)
}

#[tauri::command]
async fn app_reset_data(app: AppHandle, state: State<'_, Arc<AppState>>) -> Result<(), String> {
    let app_dir = app.path().app_data_dir()
        .unwrap_or_else(|_| std::env::current_dir().unwrap());
    
    let db_path = app_dir.join("mosaic.sqlite");
    
    // 1. Close the database connection
    // Note: Since the pool is in the state and shared, we might need a way to close it
    // For now, let's just delete the file if possible, or clear tables
    
    // Safer approach: Clear all tables
    state.db.reset_database().await?;
    
    // Relaunch the app
    app.restart();
    
    Ok(())
}

fn get_wsl_host_ip() -> Option<String> {
    // Detection for WSL environment
    if std::path::Path::new("/proc/sys/fs/binfmt_misc/WSLInterop").exists() || std::env::var("WSL_DISTRO_NAME").is_ok() {
        // Try to get the host IP from /etc/resolv.conf
        if let Ok(content) = std::fs::read_to_string("/etc/resolv.conf") {
            for line in content.lines() {
                if line.starts_with("nameserver") {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() > 1 {
                        return Some(parts[1].to_string());
                    }
                }
            }
        }
    }
    None
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .setup(|app| {
            let app_handle = app.handle().clone();
            
            // Initialize Database
            tauri::async_runtime::block_on(async move {
                let app_dir = app_handle.path().app_data_dir()
                    .unwrap_or_else(|_| std::env::current_dir().unwrap());
                
                println!("[Main] Resolved App Data Directory: {:?}", app_dir);

                // Ensure the directory exists
                if !app_dir.exists() {
                    println!("[Main] Creating App Data Directory...");
                    std::fs::create_dir_all(&app_dir).expect("Failed to create app data directory");
                }

                let db_path = app_dir.join("mosaic.sqlite");
                println!("[Main] Full Database Path: {:?}", db_path);

                let db = db::DbService::new(db_path).await.expect("Failed to init DB");
                let tools = core::tools::get_default_tools();
                
                // Providers
                let api_key = db.get_setting("openrouter_api_key").await.unwrap_or(None).unwrap_or_default();
                let llm = Arc::new(llm::openrouter::OpenRouter::new(api_key));
                
                let lm_studio_base_url = db.get_setting("lm_studio_base_url").await.unwrap_or(None);
                let base_url = match lm_studio_base_url {
                    Some(url) if !url.is_empty() => Some(url),
                    _ => {
                        // Fallback: Check if we are in WSL and try to find the host IP
                        get_wsl_host_ip().map(|ip| format!("http://{}:1234/v1", ip))
                    }
                };
                
                let lm_studio = Arc::new(llm::lmstudio::LMStudio::new(base_url));
                
                let state = Arc::new(AppState::new(db, tools, llm, lm_studio));
                app_handle.manage(state);
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ping,
            get_agents,
            agent_stream,
            stop_agent,
            agents_save,
            agents_delete,
            agents_update_visibility,
            messages_list,
            messages_add,
            messages_update,
            messages_clear_for_agent,
            desktops_list,
            desktops_save,
            desktops_delete,
            settings_get,
            settings_set,
            providers_get,
            list_directories,
            fetch_files,
            create_directory,
            app_reset_data
        ])


        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
