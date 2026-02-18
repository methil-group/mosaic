use async_trait::async_trait;
use std::collections::HashMap;

use super::{Tool, ToolCategory, resolve_path, truncate_result};

pub struct ListDirectoryTool;

#[async_trait]
impl Tool for ListDirectoryTool {
    fn name(&self) -> String { "list_directory".to_string() }

    fn description(&self) -> String {
        "List the contents of a directory, showing files and subdirectories with their types \
         and sizes. Use this to understand a project's structure before diving into specific files. \
         Hidden files and build output directories are excluded by default."
            .to_string()
    }

    fn parameters(&self) -> String {
        serde_json::json!({
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Directory path to list (relative to workspace or absolute). Defaults to workspace root."
                },
                "recursive": {
                    "type": "string",
                    "description": "If 'true', list recursively up to max_depth. Default: 'false'."
                },
                "max_depth": {
                    "type": "string",
                    "description": "Maximum depth for recursive listing. Default: '3'."
                }
            },
            "required": []
        })
        .to_string()
    }

    fn category(&self) -> ToolCategory { ToolCategory::FileSystem }

    async fn execute(&self, params: HashMap<String, String>, workspace: &str) -> Result<String, String> {
        let path = params.get("path").map(|s| s.as_str()).unwrap_or(".");
        let recursive = params.get("recursive").map(|s| s == "true").unwrap_or(false);
        let max_depth: usize = params.get("max_depth").and_then(|s| s.parse().ok()).unwrap_or(3);

        let dir_path = resolve_path(workspace, path);

        if !dir_path.is_dir() {
            return Err(format!("'{}' is not a directory", dir_path.display()));
        }

        let skip_dirs = ["node_modules", "target", ".git", ".nuxt", ".output", "dist", "__pycache__"];

        let mut output = format!("DIRECTORY: {}\n{}\n", dir_path.display(), "─".repeat(60));

        fn list_recursive(
            dir: &std::path::Path,
            prefix: &str,
            depth: usize,
            max_depth: usize,
            skip_dirs: &[&str],
            output: &mut String,
        ) -> Result<(), String> {
            let mut entries: Vec<_> = std::fs::read_dir(dir)
                .map_err(|e| format!("Cannot read '{}': {}", dir.display(), e))?
                .filter_map(|e| e.ok())
                .collect();

            entries.sort_by(|a, b| {
                let a_dir = a.file_type().map(|t| t.is_dir()).unwrap_or(false);
                let b_dir = b.file_type().map(|t| t.is_dir()).unwrap_or(false);
                b_dir.cmp(&a_dir).then(a.file_name().cmp(&b.file_name()))
            });

            for entry in &entries {
                let name = entry.file_name().to_string_lossy().to_string();

                if name.starts_with('.') { continue; }
                if skip_dirs.contains(&name.as_str()) { continue; }

                let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);

                if is_dir {
                    output.push_str(&format!("{}📁 {}/\n", prefix, name));
                    if depth < max_depth {
                        list_recursive(&entry.path(), &format!("{}  ", prefix), depth + 1, max_depth, skip_dirs, output)?;
                    }
                } else {
                    let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
                    let size_str = if size > 1_000_000 {
                        format!("{:.1}MB", size as f64 / 1_000_000.0)
                    } else if size > 1_000 {
                        format!("{:.1}KB", size as f64 / 1_000.0)
                    } else {
                        format!("{}B", size)
                    };
                    output.push_str(&format!("{}   {} ({})\n", prefix, name, size_str));
                }
            }
            Ok(())
        }

        if recursive {
            list_recursive(&dir_path, "", 0, max_depth, &skip_dirs, &mut output)?;
        } else {
            list_recursive(&dir_path, "", 0, 0, &skip_dirs, &mut output)?;
        }

        Ok(truncate_result(&output, 15_000))
    }
}
