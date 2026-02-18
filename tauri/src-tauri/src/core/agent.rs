use crate::llm::{LlmProvider, Message, LlmEvent};
use crate::core::tools::ToolRegistry;
use crate::core::prompt::PromptBuilder;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::collections::HashMap;
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
    tools: Arc<ToolRegistry>,
}

impl Agent {
    pub fn new(
        llm: Arc<dyn LlmProvider>,
        model: String,
        workspace: String,
        user_name: String,
        tools: Arc<ToolRegistry>,
    ) -> Self {
        Self {
            llm,
            model,
            workspace,
            user_name,
            messages: Mutex::new(Vec::new()),
            stopped: Mutex::new(false),
            tools,
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
        persona: Option<String>,
        on_event: impl Fn(AgentEvent) + Send + Sync + 'static,
    ) -> Result<(), String> {
        // Build prompts using PromptBuilder
        let system_prompt = PromptBuilder::create_system_prompt(
            self.tools.get_tools(),
            &self.workspace,
            &self.user_name,
            persona
        );
        
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

            // Parse tool call
            if let Some((name, params)) = self.parse_tool_call(&full_text) {
                on_event(AgentEvent::ToolStarted { 
                    name: name.clone(), 
                    parameters: serde_json::to_string(&params).unwrap_or_default()
                });

                // Tool Execution
                let result = if let Some(tool) = self.tools.find(&name) {
                    tool.execute(params, &self.workspace).await.unwrap_or_else(|e| format!("Error: {}", e))
                } else {
                    format!("Error: Tool '{}' not found", name)
                };
                
                on_event(AgentEvent::ToolFinished { 
                    name: name.clone(), 
                    result: result.clone() 
                });

                {
                    let mut msgs = self.messages.lock().await;
                    msgs.push(Message { role: "assistant".to_string(), content: full_text });
                    
                    let result_msg = PromptBuilder::format_tool_result(&name, &result);
                    msgs.push(Message { role: "user".to_string(), content: result_msg });
                }
            } else {
                on_event(AgentEvent::FinalAnswer { data: full_text.clone() });
                loop_active = false;
            }
        }

        Ok(())
    }

    fn parse_tool_call(&self, content: &str) -> Option<(String, HashMap<String, String>)> {
        // Quick and dirty XML parse logic to match TS implementation
        if let Some(start) = content.find("<tool_call>") {
            if let Some(end) = content.find("</tool_call>") {
                let inner = &content[start + 11..end];
                let name = if let Some(n_start) = inner.find("<name>") {
                    if let Some(n_end) = inner.find("</name>") {
                        inner[n_start + 6..n_end].trim().to_string()
                    } else { return None; }
                } else { return None; };
                
                let mut params = HashMap::new();
                if let Some(p_start) = inner.find("<parameters>") {
                    if let Some(p_end) = inner.find("</parameters>") {
                        let p_inner = &inner[p_start + 12..p_end];
                        // Extremely simple tag parsing for parameters
                        let mut current = p_inner;
                        while let Some(tag_start) = current.find('<') {
                            if let Some(tag_end) = current[tag_start..].find('>') {
                                let tag_name = &current[tag_start + 1..tag_start + tag_end];
                                let close_tag = format!("</{}>", tag_name);
                                if let Some(val_end) = current.find(&close_tag) {
                                    let val = &current[tag_start + tag_end + 1..val_end];
                                    params.insert(tag_name.to_string(), val.trim().to_string());
                                    current = &current[val_end + close_tag.len()..];
                                } else { break; }
                            } else { break; }
                        }
                    }
                }
                
                return Some((name, params));
            }
        }
        None
    }
}
