use async_trait::async_trait;
use std::collections::HashMap;

use super::{Tool, ToolCategory, ToolExample, resolve_path, truncate_result};

pub struct SearchFilesTool;

#[async_trait]
impl Tool for SearchFilesTool {
    fn name(&self) -> String { "search_files".to_string() }

    fn description(&self) -> String {
        "Search for a text pattern across files in the workspace using recursive grep. \
         Returns matching lines with file paths and line numbers. Use this to find function \
         definitions, usages, imports, error messages, or any text pattern. \
         Automatically skips hidden files and common build directories (node_modules, target, .git)."
            .to_string()
    }

    fn parameters(&self) -> String {
        serde_json::json!({
            "type": "object",
            "properties": {
                "pattern": {
                    "type": "string",
                    "description": "The text pattern to search for (plain text or regex)."
                },
                "path": {
                    "type": "string",
                    "description": "Optional subdirectory to search in (relative to workspace). Defaults to entire workspace."
                },
                "include_glob": {
                    "type": "string",
                    "description": "Optional glob to filter files (e.g. '*.rs', '*.ts'). Defaults to all files."
                }
            },
            "required": ["pattern"]
        })
        .to_string()
    }

    fn category(&self) -> ToolCategory { ToolCategory::CodeIntelligence }

    fn examples(&self) -> Vec<ToolExample> {
        vec![ToolExample {
            description: "Find all usages of a function".to_string(),
            xml: "<tool_call>\n  <name>search_files</name>\n  <parameters>\n    <pattern>fn create_instance</pattern>\n    <include_glob>*.rs</include_glob>\n  </parameters>\n</tool_call>".to_string(),
        }]
    }

    async fn execute(&self, params: HashMap<String, String>, workspace: &str) -> Result<String, String> {
        let pattern = params.get("pattern").ok_or("Missing 'pattern' parameter")?;
        let sub_path = params.get("path").map(|s| s.as_str()).unwrap_or(".");
        let search_dir = resolve_path(workspace, sub_path);

        let mut cmd_parts = vec![
            "grep".to_string(),
            "-rn".to_string(),
            "--color=never".to_string(),
            "--exclude-dir=.git".to_string(),
            "--exclude-dir=node_modules".to_string(),
            "--exclude-dir=target".to_string(),
            "--exclude-dir=.nuxt".to_string(),
            "--exclude-dir=.output".to_string(),
            "--exclude-dir=dist".to_string(),
        ];

        if let Some(glob) = params.get("include_glob") {
            cmd_parts.push(format!("--include={}", glob));
        }

        cmd_parts.push("--".to_string());
        cmd_parts.push(pattern.clone());
        cmd_parts.push(search_dir.to_string_lossy().to_string());

        let output = tokio::process::Command::new("grep")
            .args(&cmd_parts[1..])
            .output()
            .await
            .map_err(|e| format!("Failed to run grep: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout);

        if stdout.is_empty() {
            return Ok(format!("No matches found for '{}' in {}", pattern, search_dir.display()));
        }

        let match_count = stdout.lines().count();
        let header = format!("Found {} matches for '{}':\n\n", match_count, pattern);

        Ok(truncate_result(&format!("{}{}", header, stdout), 15_000))
    }
}
