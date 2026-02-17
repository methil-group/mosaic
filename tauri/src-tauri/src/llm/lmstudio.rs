use crate::llm::{LlmProvider, Message, LlmEvent};
use async_trait::async_trait;
use futures_util::{Stream, StreamExt};
use reqwest::Client;
use serde_json::Value;
use std::pin::Pin;
use std::time::Duration;

pub struct LMStudio {
    base_url: String,
    client: Client,
}

impl LMStudio {
    pub fn new(base_url: Option<String>) -> Self {
        Self {
            base_url: base_url.unwrap_or_else(|| "http://localhost:1234/v1".to_string()),
            client: Client::new(),
        }
    }
}

#[async_trait]
impl LlmProvider for LMStudio {
    async fn stream_chat(
        &self,
        model: &str,
        messages: Vec<Message>,
    ) -> Result<Pin<Box<dyn Stream<Item = LlmEvent> + Send>>, String> {
        let response = self.client
            .post(format!("{}/chat/completions", self.base_url))
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({
                "model": model,
                "messages": messages,
                "stream": true
            }))
            .send()
            .await
            .map_err(|e| format!("LM Studio Request failed: {}. Is LM Studio running on port 1234?", e))?;

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
                            continue;
                        }
                        
                        if let Ok(json) = serde_json::from_str::<Value>(data) {
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
        let response = self.client
            .get(format!("{}/models", self.base_url))
            .timeout(Duration::from_millis(2000))
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let json: Value = response.json().await.map_err(|e| e.to_string())?;
        let mut models = Vec::new();

        if let Some(data) = json.get("data").and_then(|d| d.as_array()) {
            for model in data {
                if let Some(id) = model.get("id").and_then(|i| i.as_str()) {
                    models.push(id.to_string());
                }
            }
        }

        Ok(models)
    }
}
