mod read_file;
mod write_file;
mod edit_file;
mod run_command;
mod search_files;
mod list_directory;
mod manage_todos;

use async_trait::async_trait;
use std::collections::HashMap;
use std::path::PathBuf;

// Re-export all tools
pub use read_file::ReadFileTool;
pub use write_file::WriteFileTool;
pub use edit_file::EditFileTool;
pub use run_command::RunCommandTool;
pub use search_files::SearchFilesTool;
pub use list_directory::ListDirectoryTool;
pub use manage_todos::ManageTodosTool;

// ─── Types ───────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
pub enum ToolCategory {
    FileSystem,
    CodeIntelligence,
    Execution,
    Communication,
    General,
}

pub struct ToolExample {
    pub description: String,
    pub xml: String,
}

// ─── Tool Trait ──────────────────────────────────────────────────────────────

#[async_trait]
pub trait Tool: Send + Sync {
    fn name(&self) -> String;
    fn description(&self) -> String;
    fn parameters(&self) -> String; // JSON schema string

    fn examples(&self) -> Vec<ToolExample> { vec![] }
    fn category(&self) -> ToolCategory { ToolCategory::General }
    fn is_destructive(&self) -> bool { false }

    async fn execute(&self, params: HashMap<String, String>, workspace: &str) -> Result<String, String>;
}

// ─── Tool Registry ───────────────────────────────────────────────────────────

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

// ─── Shared Utilities ────────────────────────────────────────────────────────

pub fn resolve_path(workspace: &str, path: &str) -> PathBuf {
    let p = PathBuf::from(path);
    if p.is_absolute() {
        p
    } else {
        PathBuf::from(workspace).join(path)
    }
}

pub fn truncate_result(result: &str, max_chars: usize) -> String {
    if result.len() > max_chars {
        format!(
            "{}\n\n... [TRUNCATED: {} total chars, showing first {}]",
            &result[..max_chars],
            result.len(),
            max_chars
        )
    } else {
        result.to_string()
    }
}

// ─── Registry Factory ────────────────────────────────────────────────────────

pub fn get_default_tools() -> ToolRegistry {
    let mut registry = ToolRegistry::new();
    registry.register(Box::new(ReadFileTool));
    registry.register(Box::new(WriteFileTool));
    registry.register(Box::new(EditFileTool));
    registry.register(Box::new(RunCommandTool));
    registry.register(Box::new(SearchFilesTool));
    registry.register(Box::new(ListDirectoryTool));
    registry.register(Box::new(ManageTodosTool));
    registry
}
