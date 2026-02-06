use serde::{Deserialize, Serialize};
use async_trait::async_trait;
use futures_util::Stream;
use std::pin::Pin;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Message {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Usage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum LlmEvent {
    Token { token: String },
    Usage { usage: Usage },
    Complete { content: String },
    Error { message: String },
}

#[async_trait]
pub trait LlmProvider: Send + Sync {
    async fn stream_chat(
        &self,
        model: &str,
        messages: Vec<Message>,
    ) -> Result<Pin<Box<dyn Stream<Item = LlmEvent> + Send>>, String>;
    
    async fn fetch_models(&self) -> Result<Vec<String>, String>;
}

pub mod openrouter;
pub mod lmstudio;
