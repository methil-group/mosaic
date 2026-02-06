use async_trait::async_trait;
use std::collections::HashMap;

#[async_trait]
pub trait Tool: Send + Sync {
    fn name(&self) -> String;
    fn description(&self) -> String;
    fn parameters(&self) -> String; // JSON string of parameters
    async fn execute(&self, params: HashMap<String, String>, workspace: &str) -> Result<String, String>;
}

pub struct ToolRegistry {
    tools: Vec<Box<dyn Tool>>,
}

impl ToolRegistry {
    pub fn new() -> Self {
        Self { tools: Vec::new() }
    }

    pub fn register(&mut self, tool: Box<dyn Tool>) {
        self.tools.push(tool);
    }

    pub fn get_tools(&self) -> &Vec<Box<dyn Tool>> {
        &self.tools
    }

    pub fn find(&self, name: &str) -> Option<&Box<dyn Tool>> {
        self.tools.iter().find(|t| t.name() == name)
    }
}

pub struct ReadFileTool;

#[async_trait]
impl Tool for ReadFileTool {
    fn name(&self) -> String { "read_file".to_string() }
    fn description(&self) -> String { "Read the contents of a file at the given path.".to_string() }
    fn parameters(&self) -> String {
        serde_json::json!({
            "type": "object",
            "properties": {
                "path": { "type": "string", "description": "Path to the file to read." }
            },
            "required": ["path"]
        }).to_string()
    }

    async fn execute(&self, params: HashMap<String, String>, workspace: &str) -> Result<String, String> {
        let path = params.get("path").ok_or("Missing path parameter")?;
        let full_path = std::path::PathBuf::from(workspace).join(path);
        
        std::fs::read_to_string(full_path).map_err(|e| e.to_string())
    }
}

pub struct WriteFileTool;

#[async_trait]
impl Tool for WriteFileTool {
    fn name(&self) -> String { "write_file".to_string() }
    fn description(&self) -> String { "Write content to a file. Warning: This overwrites existing content.".to_string() }
    fn parameters(&self) -> String {
        serde_json::json!({
            "type": "object",
            "properties": {
                "path": { "type": "string", "description": "Path where the file will be written." },
                "content": { "type": "string", "description": "The content to write to the file." }
            },
            "required": ["path", "content"]
        }).to_string()
    }

    async fn execute(&self, params: HashMap<String, String>, workspace: &str) -> Result<String, String> {
        let path = params.get("path").ok_or("Missing path parameter")?;
        let content = params.get("content").ok_or("Missing content parameter")?;
        let full_path = std::path::PathBuf::from(workspace).join(path);
        
        if let Some(parent) = full_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        
        std::fs::write(full_path, content).map_err(|e| e.to_string())?;
        Ok("File written successfully".to_string())
    }
}

pub fn get_default_tools() -> ToolRegistry {
    let mut registry = ToolRegistry::new();
    registry.register(Box::new(ReadFileTool));
    registry.register(Box::new(WriteFileTool));
    registry
}

