use super::PromptPart;

pub struct IdentityPart {
    pub user_name: String,
}

impl PromptPart for IdentityPart {
    fn render(&self) -> String {
        format!(
            "You are MOSAIC, a highly capable AI coding agent. You operate inside a workspace \
             and have direct access to tools for reading, writing, editing files, running commands, \
             and searching code.\n\
             Your user is {}. Be concise, precise, and action-oriented.",
            self.user_name
        )
    }
}
