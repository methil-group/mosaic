use super::PromptPart;
use crate::core::tools::{Tool, ToolCategory};

pub struct ToolFormatPart<'a> {
    pub tools: &'a [Box<dyn Tool>],
}

impl<'a> PromptPart for ToolFormatPart<'a> {
    fn render(&self) -> String {
        let categories = [
            (ToolCategory::FileSystem, "FILE SYSTEM"),
            (ToolCategory::CodeIntelligence, "CODE INTELLIGENCE"),
            (ToolCategory::Execution, "EXECUTION"),
            (ToolCategory::Communication, "COMMUNICATION"),
            (ToolCategory::General, "GENERAL"),
        ];

        let mut tool_sections = String::new();

        for (cat, cat_name) in &categories {
            let cat_tools: Vec<&Box<dyn Tool>> = self.tools.iter().filter(|t| &t.category() == cat).collect();
            if cat_tools.is_empty() { continue; }

            tool_sections.push_str(&format!("\n### {}\n\n", cat_name));

            for tool in cat_tools {
                let destructive_badge = if tool.is_destructive() { " ⚠️ DESTRUCTIVE" } else { "" };
                tool_sections.push_str(&format!("**{}**{}\n", tool.name(), destructive_badge));
                tool_sections.push_str(&format!("{}\n", tool.description()));

                // Parameters
                if let Ok(params) = serde_json::from_str::<serde_json::Value>(&tool.parameters()) {
                    if let Some(props) = params.get("properties").and_then(|p| p.as_object()) {
                        let required: Vec<String> = params.get("required")
                            .and_then(|r| r.as_array())
                            .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                            .unwrap_or_default();

                        tool_sections.push_str("Parameters:\n");
                        for (name, schema) in props {
                            let desc = schema.get("description").and_then(|d| d.as_str()).unwrap_or("");
                            let req = if required.contains(name) { " (required)" } else { " (optional)" };
                            tool_sections.push_str(&format!("  - `{}`{}: {}\n", name, req, desc));
                        }
                    }
                }

                // Examples
                let examples = tool.examples();
                if !examples.is_empty() {
                    for ex in &examples {
                        tool_sections.push_str(&format!("Example — {}:\n{}\n", ex.description, ex.xml));
                    }
                }

                tool_sections.push('\n');
            }
        }

        format!(
            "## AVAILABLE TOOLS\n\
             {}\n\
             ## TOOL CALLING FORMAT\n\n\
             To call a tool, use this XML format. All parameter values MUST be strings:\n\
             <tool_call>\n  <name>tool_name</name>\n  <parameters>\n    <param_name>value</param_name>\n  </parameters>\n</tool_call>\n\n\
             You can call ONE tool at a time. After each call, the system provides the result in a <tool_result> block.\n\
             Wait for the result before proceeding to the next step.",
            tool_sections
        )
    }
}
