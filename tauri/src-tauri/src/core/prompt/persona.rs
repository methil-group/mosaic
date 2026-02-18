use super::PromptPart;

pub struct PersonaPart {
    pub persona: String,
}

impl PromptPart for PersonaPart {
    fn render(&self) -> String {
        format!("## YOUR PERSONA\n\n{}", self.persona)
    }
}
