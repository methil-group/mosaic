mod identity;
mod tool_format;
mod coding_workflow;
mod checklist;
mod persona;
mod builder;

// Re-export the trait and all parts
pub use identity::IdentityPart;
pub use tool_format::ToolFormatPart;
pub use coding_workflow::CodingWorkflowPart;
pub use checklist::ChecklistBehaviorPart;
pub use persona::PersonaPart;
pub use builder::PromptBuilder;

// ─── Prompt Part Trait ───────────────────────────────────────────────────────

pub trait PromptPart {
    fn render(&self) -> String;
}
