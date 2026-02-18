use async_trait::async_trait;
use std::collections::HashMap;

use super::{Tool, ToolCategory, ToolExample, resolve_path};

pub struct EditFileTool;

#[async_trait]
impl Tool for EditFileTool {
    fn name(&self) -> String { "edit_file".to_string() }

    fn description(&self) -> String {
        "Make surgical edits to an existing file by replacing specific content. This is the \
         PREFERRED way to modify files — it replaces only the matched section, leaving everything \
         else untouched. You MUST read the file first to know the exact content to replace. \
         The old_content must match EXACTLY (including whitespace and indentation)."
            .to_string()
    }

    fn parameters(&self) -> String {
        serde_json::json!({
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path to the file to edit."
                },
                "old_content": {
                    "type": "string",
                    "description": "The exact content to find and replace. Must match the file content precisely."
                },
                "new_content": {
                    "type": "string",
                    "description": "The content to replace old_content with."
                }
            },
            "required": ["path", "old_content", "new_content"]
        })
        .to_string()
    }

    fn category(&self) -> ToolCategory { ToolCategory::FileSystem }
    fn is_destructive(&self) -> bool { true }

    fn examples(&self) -> Vec<ToolExample> {
        vec![ToolExample {
            description: "Replace a function implementation".to_string(),
            xml: "<tool_call>\n  <name>edit_file</name>\n  <parameters>\n    <path>src/main.rs</path>\n    <old_content>fn hello() {\n    println!(\"Hello\");\n}</old_content>\n    <new_content>fn hello() {\n    println!(\"Hello, World!\");\n}</new_content>\n  </parameters>\n</tool_call>".to_string(),
        }]
    }

    async fn execute(&self, params: HashMap<String, String>, workspace: &str) -> Result<String, String> {
        let path = params.get("path").ok_or("Missing 'path' parameter")?;
        let old_content = params.get("old_content").ok_or("Missing 'old_content' parameter")?;
        let new_content = params.get("new_content").ok_or("Missing 'new_content' parameter")?;
        let full_path = resolve_path(workspace, path);

        let file_content = std::fs::read_to_string(&full_path)
            .map_err(|e| format!("Failed to read '{}': {}", full_path.display(), e))?;

        let occurrence_count = file_content.matches(old_content).count();

        if occurrence_count == 0 {
            return Err(format!(
                "old_content not found in '{}'. Make sure you read the file first and copy the \
                 exact content including whitespace. The file has {} lines.",
                full_path.display(),
                file_content.lines().count()
            ));
        }

        if occurrence_count > 1 {
            return Err(format!(
                "old_content found {} times in '{}'. Provide a larger, more unique snippet to \
                 match exactly one location.",
                occurrence_count,
                full_path.display()
            ));
        }

        let updated = file_content.replacen(old_content, new_content, 1);
        std::fs::write(&full_path, &updated).map_err(|e| e.to_string())?;

        let old_lines = old_content.lines().count();
        let new_lines = new_content.lines().count();
        let diff = new_lines as i64 - old_lines as i64;
        let diff_str = if diff > 0 { format!("+{}", diff) } else { format!("{}", diff) };

        Ok(format!(
            "✓ Edit applied to '{}': replaced {} lines → {} lines ({})",
            full_path.display(),
            old_lines,
            new_lines,
            diff_str
        ))
    }
}
