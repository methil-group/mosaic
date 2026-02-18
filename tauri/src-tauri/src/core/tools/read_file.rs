use async_trait::async_trait;
use std::collections::HashMap;

use super::{Tool, ToolCategory, ToolExample, resolve_path, truncate_result};

pub struct ReadFileTool;

#[async_trait]
impl Tool for ReadFileTool {
    fn name(&self) -> String { "read_file".to_string() }

    fn description(&self) -> String {
        "Read the contents of a file with line numbers. Use this to understand existing code \
         BEFORE making any changes. For very large files, consider using search_files first to \
         locate the relevant section. Returns numbered lines for easy reference with edit_file."
            .to_string()
    }

    fn parameters(&self) -> String {
        serde_json::json!({
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path to the file (relative to workspace or absolute)."
                }
            },
            "required": ["path"]
        })
        .to_string()
    }

    fn category(&self) -> ToolCategory { ToolCategory::FileSystem }

    fn examples(&self) -> Vec<ToolExample> {
        vec![ToolExample {
            description: "Read a source file to understand its structure".to_string(),
            xml: "<tool_call>\n  <name>read_file</name>\n  <parameters>\n    <path>src/main.rs</path>\n  </parameters>\n</tool_call>".to_string(),
        }]
    }

    async fn execute(&self, params: HashMap<String, String>, workspace: &str) -> Result<String, String> {
        let path = params.get("path").ok_or("Missing 'path' parameter")?;
        let full_path = resolve_path(workspace, path);

        let content = std::fs::read_to_string(&full_path)
            .map_err(|e| format!("Failed to read '{}': {}", full_path.display(), e))?;

        let numbered: String = content
            .lines()
            .enumerate()
            .map(|(i, line)| format!("{:>4} | {}", i + 1, line))
            .collect::<Vec<_>>()
            .join("\n");

        let total_lines = content.lines().count();
        let header = format!("FILE: {} ({} lines)\n{}\n", full_path.display(), total_lines, "─".repeat(60));

        Ok(truncate_result(&format!("{}{}", header, numbered), 30_000))
    }
}
