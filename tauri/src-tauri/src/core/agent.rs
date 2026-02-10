use crate::llm::{LlmProvider, Message, LlmEvent};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use futures_util::StreamExt;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum AgentEvent {
    Token { data: String },
    ToolStarted { name: String, parameters: String },
    ToolFinished { name: String, result: String },
    FinalAnswer { data: String },
    Usage { data: String },
    Error { message: String },
}

pub struct Agent {
    llm: Arc<dyn LlmProvider>,
    model: String,
    workspace: String,
    user_name: String,
    messages: Mutex<Vec<Message>>,
    stopped: Mutex<bool>,
}

impl Agent {
    pub fn new(
        llm: Arc<dyn LlmProvider>,
        model: String,
        workspace: String,
        user_name: String,
    ) -> Self {
        Self {
            llm,
            model,
            workspace,
            user_name,
            messages: Mutex::new(Vec::new()),
            stopped: Mutex::new(false),
        }
    }

    pub async fn stop(&self) {
        let mut stopped = self.stopped.lock().await;
        *stopped = true;
    }

    pub async fn run(
        &self,
        user_prompt: String,
        history: Vec<Message>,
        _persona: Option<String>,
        on_event: impl Fn(AgentEvent) + Send + Sync + 'static,
    ) -> Result<(), String> {
        // Build prompts (simulated for now, would use PromptBuilder port)
        let system_prompt = format!("You are an AI assistant in workspace {}. User is {}.", self.workspace, self.user_name);
        
        {
            let mut msgs = self.messages.lock().await;
            msgs.clear();
            msgs.push(Message { role: "system".to_string(), content: system_prompt });
            msgs.extend(history);
            msgs.push(Message { role: "user".to_string(), content: user_prompt });
        }

        self.reasoning_loop(on_event).await
    }

    async fn reasoning_loop(
        &self,
        on_event: impl Fn(AgentEvent) + Send + Sync + 'static,
    ) -> Result<(), String> {
        let mut total_steps = 0;
        let mut loop_active = true;
        let on_event = Arc::new(on_event);

        while loop_active {
            if *self.stopped.lock().await {
                break;
            }

            total_steps += 1;
            if total_steps > 100 {
                on_event(AgentEvent::Error { message: "Max steps reached".to_string() });
                break;
            }

            let messages = self.messages.lock().await.clone();
            let mut stream = self.llm.stream_chat(&self.model, messages).await?;
            
            let mut full_text = String::new();
            while let Some(event) = stream.next().await {
                match event {
                    LlmEvent::Token { token } => {
                        full_text.push_str(&token);
                        on_event(AgentEvent::Token { data: token });
                    }
                    LlmEvent::Usage { usage } => {
                        on_event(AgentEvent::Usage { data: serde_json::to_string(&usage).unwrap_or_default() });
                    }
                    LlmEvent::Error { message } => {
                        on_event(AgentEvent::Error { message });
                        return Err("LLM Stream Error".to_string());
                    }
                    _ => {}
                }
            }

            // Parse tool call (simpler XML parsing for now)
            if let Some(tool_call) = self.parse_tool_call(&full_text) {
                let name = tool_call.0;
                let params = tool_call.1;
                
                on_event(AgentEvent::ToolStarted { 
                    name: name.clone(), 
                    parameters: params.clone() 
                });

                // Tool Execution (TODO: Port Tools logic)
                let result = format!("Tool {} execution simulated", name);
                
                on_event(AgentEvent::ToolFinished { 
                    name: name.clone(), 
                    result: result.clone() 
                });

                {
                    let mut msgs = self.messages.lock().await;
                    msgs.push(Message { role: "assistant".to_string(), content: full_text });
                    msgs.push(Message { role: "user".to_string(), content: format!("Tool result for {}: {}", name, result) });
                }
            } else {
                on_event(AgentEvent::FinalAnswer { data: full_text.clone() });
                loop_active = false;
            }
        }

        Ok(())
    }

    fn parse_tool_call(&self, content: &str) -> Option<(String, String)> {
        // Quick and dirty XML parse logic to match TS implementation
        if let Some(start) = content.find("<tool_call>") {
            if let Some(end) = content.find("</tool_call>") {
                let inner = &content[start + 11..end];
                let name = if let Some(n_start) = inner.find("<name>") {
                    if let Some(n_end) = inner.find("</name>") {
                        inner[n_start + 6..n_end].trim().to_string()
                    } else { "unknown".to_string() }
                } else { "unknown".to_string() };
                
                let params = if let Some(p_start) = inner.find("<parameters>") {
                    if let Some(p_end) = inner.find("</parameters>") {
                        inner[p_start + 12..p_end].trim().to_string()
                    } else { "".to_string() }
                } else { "".to_string() };
                
                return Some((name, params));
            }
        }
        None
    }
}
