use async_trait::async_trait;
use std::collections::HashMap;

use super::{Tool, ToolCategory, ToolExample, truncate_result};

pub struct RunCommandTool;

#[async_trait]
impl Tool for RunCommandTool {
    fn name(&self) -> String { "run_command".to_string() }

    fn description(&self) -> String {
        "Execute a shell command in the workspace directory. Use this to run builds, tests, \
         linters, git commands, or any CLI tool. The command runs with the workspace as the \
         working directory. Returns stdout, stderr, and exit code. \
         Commands are automatically killed after the timeout (default: 30s)."
            .to_string()
    }

    fn parameters(&self) -> String {
        serde_json::json!({
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "description": "The shell command to execute (e.g. 'cargo build', 'npm test', 'git status')."
                },
                "timeout_secs": {
                    "type": "string",
                    "description": "Optional timeout in seconds (default: 30). Use higher values for long builds."
                }
            },
            "required": ["command"]
        })
        .to_string()
    }

    fn category(&self) -> ToolCategory { ToolCategory::Execution }
    fn is_destructive(&self) -> bool { true }

    fn examples(&self) -> Vec<ToolExample> {
        vec![
            ToolExample {
                description: "Run tests to verify changes".to_string(),
                xml: "<tool_call>\n  <name>run_command</name>\n  <parameters>\n    <command>cargo test</command>\n  </parameters>\n</tool_call>".to_string(),
            },
            ToolExample {
                description: "Check git status".to_string(),
                xml: "<tool_call>\n  <name>run_command</name>\n  <parameters>\n    <command>git status --short</command>\n  </parameters>\n</tool_call>".to_string(),
            },
        ]
    }

    async fn execute(&self, params: HashMap<String, String>, workspace: &str) -> Result<String, String> {
        let command = params.get("command").ok_or("Missing 'command' parameter")?;
        let timeout_secs: u64 = params
            .get("timeout_secs")
            .and_then(|s| s.parse().ok())
            .unwrap_or(30);

        let result = tokio::time::timeout(
            std::time::Duration::from_secs(timeout_secs),
            tokio::process::Command::new("sh")
                .arg("-c")
                .arg(command)
                .current_dir(workspace)
                .output(),
        )
        .await;

        match result {
            Ok(Ok(output)) => {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let stderr = String::from_utf8_lossy(&output.stderr);
                let exit_code = output.status.code().unwrap_or(-1);

                let mut result_str = format!("EXIT CODE: {}\n", exit_code);

                if !stdout.is_empty() {
                    result_str.push_str(&format!("\n── STDOUT ──\n{}\n", stdout));
                }
                if !stderr.is_empty() {
                    result_str.push_str(&format!("\n── STDERR ──\n{}\n", stderr));
                }
                if stdout.is_empty() && stderr.is_empty() {
                    result_str.push_str("(no output)\n");
                }

                Ok(truncate_result(&result_str, 15_000))
            }
            Ok(Err(e)) => Err(format!("Failed to execute command: {}", e)),
            Err(_) => Err(format!(
                "Command timed out after {}s. Consider increasing timeout_secs.",
                timeout_secs
            )),
        }
    }
}
