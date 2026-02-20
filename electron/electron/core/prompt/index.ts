import type { PromptPart } from './types'
import type { Tool } from '../tools/types'
import IdentityPart from './identity'
import CodingWorkflowPart from './coding_workflow'
import ToolFormatPart from './tool_format'
import ChecklistBehaviorPart from './checklist'
import PersonaPart from './persona'

class PromptBuilder {
    static createSystemPrompt(tools: Tool[], _workspace: string, userName: string, persona?: string): string {
        const parts: PromptPart[] = []

        if (persona) {
            parts.push(new PersonaPart(persona))
        }

        parts.push(new IdentityPart(userName))
        parts.push(new CodingWorkflowPart())
        parts.push(new ToolFormatPart(tools))
        parts.push(new ChecklistBehaviorPart())

        return parts.map(p => p.render()).join('\n\n') + `\n\n## CRITICAL RULES

1. **ACT, don't narrate.** Never say "I will..." or "Let me..." — just call the tool.
2. **Read before writing.** Always read a file before editing it.
3. **Verify your work.** Run tests or builds after making changes.
4. **Be surgical.** Use \`edit_file\` instead of \`write_file\` for existing files.
5. **One tool per turn.** Call exactly one tool, then wait for the result.`
    }

    static formatToolResult(name: string, result: string): string {
        return `<tool_result name="${name}">\n${result}\n</tool_result>`
    }
}

export default PromptBuilder
