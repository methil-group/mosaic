use async_trait::async_trait;
use std::collections::HashMap;

use super::{Tool, ToolCategory};

pub struct ManageTodosTool;

#[async_trait]
impl Tool for ManageTodosTool {
    fn name(&self) -> String { "manage_todos".to_string() }

    fn description(&self) -> String {
        "Update your progress checklist. Use this to track what you've done, what you're \
         currently working on, and what remains. The user sees this checklist in real-time, \
         so keep it accurate."
            .to_string()
    }

    fn parameters(&self) -> String {
        serde_json::json!({
            "type": "object",
            "properties": {
                "checklist": {
                    "type": "string",
                    "description": "The full updated checklist using [ ] (pending), [>] (in-progress), [x] (done) format."
                }
            },
            "required": ["checklist"]
        })
        .to_string()
    }

    fn category(&self) -> ToolCategory { ToolCategory::Communication }

    async fn execute(&self, params: HashMap<String, String>, _workspace: &str) -> Result<String, String> {
        let checklist = params.get("checklist").ok_or("Missing 'checklist' parameter")?;
        Ok(format!("Checklist updated:\n{}", checklist))
    }
}
