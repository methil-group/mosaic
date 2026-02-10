use crate::llm::{LlmProvider, Message, LlmEvent, Usage};
use async_trait::async_trait;
use futures_util::{Stream, StreamExt};
use reqwest::Client;
use serde_json::Value;
use std::pin::Pin;

pub struct OpenRouter {
    api_key: String,
    base_url: String,
    client: Client,
}

impl OpenRouter {
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            base_url: "https://openrouter.ai/api/v1".to_string(),
            client: Client::new(),
        }
    }
}

#[async_trait]
impl LlmProvider for OpenRouter {
    async fn stream_chat(
        &self,
        model: &str,
        messages: Vec<Message>,
    ) -> Result<Pin<Box<dyn Stream<Item = LlmEvent> + Send>>, String> {
        if self.api_key.is_empty() {
            return Err("OpenRouter API Key not found".to_string());
        }

        let response = self.client
            .post(format!("{}/chat/completions", self.base_url))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .header("HTTP-Referer", "https://github.com/methil-mods/mosaic")
            .header("X-Title", "Mosaic")
            .json(&serde_json::json!({
                "model": model,
                "messages": messages,
                "stream": true,
                "stream_options": { "include_usage": true }
            }))
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let stream = response.bytes_stream().map(|result| {
            match result {
                Ok(bytes) => {
                    let chunk = String::from_utf8_lossy(&bytes);
                    let mut events = Vec::new();
                    
                    for line in chunk.lines() {
                        let trimmed = line.trim();
                        if trimmed.is_empty() || !trimmed.starts_with("data: ") {
                            continue;
                        }
                        
                        let data = &trimmed[6..];
                        if data == "[DONE]" {
                            // We handle complete via accumulation or just wait for finish_reason
                            continue;
                        }
                        
                        if let Ok(json) = serde_json::from_str::<Value>(data) {
                            if let Some(usage) = json.get("usage") {
                                if let Ok(u) = serde_json::from_value::<Usage>(usage.clone()) {
                                    events.push(LlmEvent::Usage { usage: u });
                                }
                            }
                            
                            if let Some(choices) = json.get("choices").and_then(|c| c.as_array()) {
                                if let Some(choice) = choices.get(0) {
                                    if let Some(delta) = choice.get("delta") {
                                        if let Some(content) = delta.get("content").and_then(|c| c.as_str()) {
                                            events.push(LlmEvent::Token { token: content.to_string() });
                                        }
                                    }
                                }
                            }
                        }
                    }
                    events
                }
                Err(e) => vec![LlmEvent::Error { message: e.to_string() }],
            }
        })
        .flat_map(futures_util::stream::iter);

        Ok(Box::pin(stream))
    }

    async fn fetch_models(&self) -> Result<Vec<String>, String> {
        // Not strictly needed for the port right now, but good to have
        Ok(vec![])
    }
}
