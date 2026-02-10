use crate::db::DbService;
use crate::core::tools::ToolRegistry;
use crate::core::agent::Agent;
use std::sync::Arc;
use tokio::sync::Mutex;
use std::collections::HashMap;

pub struct AppState {
    pub db: Arc<DbService>,
    pub tools: Arc<ToolRegistry>,
    pub active_agents: Mutex<HashMap<String, Arc<Agent>>>,
    pub llm: Arc<dyn crate::llm::LlmProvider>,
    pub lm_studio: Arc<crate::llm::lmstudio::LMStudio>,
}

impl AppState {
    pub fn new(db: DbService, tools: ToolRegistry, llm: Arc<dyn crate::llm::LlmProvider>, lm_studio: Arc<crate::llm::lmstudio::LMStudio>) -> Self {
        Self {
            db: Arc::new(db),
            tools: Arc::new(tools),
            active_agents: Mutex::new(HashMap::new()),
            llm,
            lm_studio,
        }
    }
}

