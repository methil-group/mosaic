use crate::core::tools::Tool;

pub trait PromptPart {
    fn render(&self) -> String;
}

pub struct IdentityPart {
    pub user_name: String,
}

impl PromptPart for IdentityPart {
    fn render(&self) -> String {
        format!(
            "You are MOSAIC, a highly capable AI agent operating in a terminal-like environment.\n\
             Your goal is to assist the user, {}, by executing tools and providing information.",
            self.user_name
        )
    }
}

pub struct ToolFormatPart<'a> {
    pub tools: &'a [Box<dyn Tool>],
}

impl<'a> PromptPart for ToolFormatPart<'a> {
    fn render(&self) -> String {
        let tools_json: Vec<serde_json::Value> = self.tools.iter().map(|t| {
            serde_json::json!({
                "name": t.name(),
                "description": t.description(),
                "parameters": serde_json::from_str::<serde_json::Value>(&t.parameters()).unwrap_or(serde_json::json!({}))
            })
        }).collect();

        format!(
            "AVAILABLE TOOLS:\n{}\n\n\
             TOOL CALLING FORMAT:\n\
             To call a tool, use the following XML-like format. All parameter values MUST be strings:\n\
             <tool_call>\n  <name>tool_name</name>\n  <parameters>\n    <your_parameter_name>the_actual_value</your_parameter_name>\n  </parameters>\n</tool_call>\n\n\
             EXAMPLE:\n\
             <tool_call>\n  <name>read_file</name>\n  <parameters>\n    <path>README.md</path>\n  </parameters>\n</tool_call>\n\n\
             You can call only one tool at a time. After a tool call, the system will provide the result in a <tool_result> block.\n\
             Wait for the result before proceeding.",
            serde_json::to_string_pretty(&tools_json).unwrap_or_default()
        )
    }
}

pub struct ChecklistBehaviorPart;

impl PromptPart for ChecklistBehaviorPart {
    fn render(&self) -> String {
        "MODIFIED BEHAVIOR: CHECKLISTS\n\
         You MUST maintain a checklist of your progress using the 'manage_todos' tool.\n\
         1. When you start a complex task, initialize the checklist.\n\
         2. For every step you take, update the checklist status.\n\
         3. Use the following format for each item in the 'checklist' parameter:\n\
            - [ ] for pending tasks\n\
            - [>] for in-progress tasks\n\
            - [x] for completed tasks\n\
            - Follow with 'Task Name <- context/details'\n\
         EXAMPLE CALL:\n\
         <tool_call>\n  <name>manage_todos</name>\n  <parameters>\n    <checklist>\n[x] Initialization <- Done\n[>] Researching files <- Currently reading routes\n[ ] Final report <- Pending\n    </checklist>\n</tool_call>\n\
         Always inform the user about the current state of the checklist.".to_string()
    }
}

pub struct PersonaPart {
    pub persona: String,
}

impl PromptPart for PersonaPart {
    fn render(&self) -> String {
        format!("## YOUR PERSONA\n\n{}", self.persona)
    }
}

pub struct PromptBuilder;

impl PromptBuilder {
    pub fn create_system_prompt(tools: &[Box<dyn Tool>], _workspace: &str, user_name: &str, persona: Option<String>) -> String {
        let mut parts: Vec<Box<dyn PromptPart>> = Vec::new();
        
        if let Some(p) = persona {
            parts.push(Box::new(PersonaPart { persona: p }));
        }
        
        parts.push(Box::new(IdentityPart { user_name: user_name.to_string() }));
        parts.push(Box::new(ToolFormatPart { tools }));
        parts.push(Box::new(ChecklistBehaviorPart));

        let rendered: Vec<String> = parts.iter().map(|p| p.render()).collect();
        
        rendered.join("\n\n") + "\n\n\
        ## CRITICAL RULES\n\n\
        1. **You MUST either call a tool OR provide a final answer. Never say what you're \"going to do\" - just DO IT.**\n\
        2. If you need more information, call the appropriate tool immediately.\n\
        3. Only provide a final answer when you have completed the task and gathered all necessary information.\n\
        4. Never respond with \"Now let me...\" or \"I will...\" - if you need to do something, call the tool."
    }

    pub fn format_tool_result(name: &str, result: &str) -> String {
        format!("<tool_result name=\"{}\">\n{}\n</tool_result>", name, result)
    }
}
