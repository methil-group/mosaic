use async_trait::async_trait;
use std::collections::HashMap;

use super::{Tool, ToolCategory, resolve_path};

pub struct WriteFileTool;

#[async_trait]
impl Tool for WriteFileTool {
    fn name(&self) -> String { "write_file".to_string() }

    fn description(&self) -> String {
        "Create a new file or completely overwrite an existing file. Use this ONLY for creating \
         new files. For modifying existing files, prefer edit_file which is safer and more precise. \
         Parent directories are created automatically."
            .to_string()
    }

    fn parameters(&self) -> String {
        serde_json::json!({
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path where the file will be created (relative to workspace or absolute)."
                },
                "content": {
                    "type": "string",
                    "description": "The full content to write to the file."
                }
            },
            "required": ["path", "content"]
        })
        .to_string()
    }

    fn category(&self) -> ToolCategory { ToolCategory::FileSystem }
    fn is_destructive(&self) -> bool { true }

    async fn execute(&self, params: HashMap<String, String>, workspace: &str) -> Result<String, String> {
        let path = params.get("path").ok_or("Missing 'path' parameter")?;
        let content = params.get("content").ok_or("Missing 'content' parameter")?;
        let full_path = resolve_path(workspace, path);

        if let Some(parent) = full_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }

        std::fs::write(&full_path, content).map_err(|e| e.to_string())?;

        let line_count = content.lines().count();
        Ok(format!("✓ File written: {} ({} lines)", full_path.display(), line_count))
    }
}
