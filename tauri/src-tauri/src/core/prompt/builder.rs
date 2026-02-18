use crate::core::tools::Tool;
use super::{PromptPart, IdentityPart, CodingWorkflowPart, ToolFormatPart, ChecklistBehaviorPart, PersonaPart};

pub struct PromptBuilder;

impl PromptBuilder {
    pub fn create_system_prompt(tools: &[Box<dyn Tool>], _workspace: &str, user_name: &str, persona: Option<String>) -> String {
        let mut parts: Vec<Box<dyn PromptPart>> = Vec::new();
        
        if let Some(p) = persona {
            parts.push(Box::new(PersonaPart { persona: p }));
        }
        
        parts.push(Box::new(IdentityPart { user_name: user_name.to_string() }));
        parts.push(Box::new(CodingWorkflowPart));
        parts.push(Box::new(ToolFormatPart { tools }));
        parts.push(Box::new(ChecklistBehaviorPart));

        let rendered: Vec<String> = parts.iter().map(|p| p.render()).collect();
        
        rendered.join("\n\n") + "\n\n\
        ## CRITICAL RULES\n\n\
        1. **ACT, don't narrate.** Never say \"I will...\" or \"Let me...\" — just call the tool.\n\
        2. **Read before writing.** Always read a file before editing it.\n\
        3. **Verify your work.** Run tests or builds after making changes.\n\
        4. **Be surgical.** Use `edit_file` instead of `write_file` for existing files.\n\
        5. **One tool per turn.** Call exactly one tool, then wait for the result."
    }

    pub fn format_tool_result(name: &str, result: &str) -> String {
        format!("<tool_result name=\"{}\">\n{}\n</tool_result>", name, result)
    }
}
