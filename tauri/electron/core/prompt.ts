import type { Tool } from './tools/index'
import { ToolCategory } from './tools/index'

// ─── Prompt Part Interface ───────────────────────────────────────────────────

export interface PromptPart {
    render(): string
}

// ─── Parts ───────────────────────────────────────────────────────────────────

export class IdentityPart implements PromptPart {
    constructor(private userName: string) { }

    render(): string {
        return `You are MOSAIC, a highly capable AI coding agent. You operate inside a workspace and have direct access to tools for reading, writing, editing files, running commands, and searching code.\nYour user is ${this.userName}. Be concise, precise, and action-oriented.`
    }
}

export class CodingWorkflowPart implements PromptPart {
    render(): string {
        return `## CODING WORKFLOW

Follow this sequence for every coding task:

1. **UNDERSTAND** — Read relevant files, search for patterns, list directory structure.
   Never modify code you haven't read first.
2. **PLAN** — Use manage_todos to outline your approach before writing any code.
3. **IMPLEMENT** — Use \`edit_file\` for modifications (preferred), \`write_file\` only for new files.
4. **VERIFY** — Run builds/tests with \`run_command\` to confirm your changes work.
5. **REPORT** — Summarize what you did, what changed, and any remaining issues.

NEVER skip step 1. NEVER write code without reading the existing file first.
ALWAYS verify your changes compile/run before reporting success.`
    }
}

export class ToolFormatPart implements PromptPart {
    constructor(private tools: Tool[]) { }

    render(): string {
        const categories: [ToolCategory, string][] = [
            [ToolCategory.FileSystem, 'FILE SYSTEM'],
            [ToolCategory.CodeIntelligence, 'CODE INTELLIGENCE'],
            [ToolCategory.Execution, 'EXECUTION'],
            [ToolCategory.Communication, 'COMMUNICATION'],
            [ToolCategory.General, 'GENERAL'],
        ]

        let toolSections = ''

        for (const [cat, catName] of categories) {
            const catTools = this.tools.filter(t => t.category() === cat)
            if (catTools.length === 0) continue

            toolSections += `\n### ${catName}\n\n`

            for (const tool of catTools) {
                const badge = tool.isDestructive() ? ' ⚠️ DESTRUCTIVE' : ''
                toolSections += `**${tool.name()}**${badge}\n`
                toolSections += `${tool.description()}\n`

                // Parameters
                try {
                    const params = JSON.parse(tool.parameters())
                    const props = params.properties || {}
                    const required: string[] = params.required || []

                    if (Object.keys(props).length > 0) {
                        toolSections += 'Parameters:\n'
                        for (const [name, schema] of Object.entries(props) as [string, any][]) {
                            const req = required.includes(name) ? ' (required)' : ' (optional)'
                            const desc = schema.description || ''
                            toolSections += `  - \`${name}\`${req}: ${desc}\n`
                        }
                    }
                } catch { /* Ignore malformed params */ }

                // Examples
                const examples = tool.examples()
                for (const ex of examples) {
                    toolSections += `Example — ${ex.description}:\n${ex.xml}\n`
                }

                toolSections += '\n'
            }
        }

        return `## AVAILABLE TOOLS
${toolSections}
## TOOL CALLING FORMAT

To call a tool, use this XML format. All parameter values MUST be strings:
<tool_call>
  <name>tool_name</name>
  <parameters>
    <param_name>value</param_name>
  </parameters>
</tool_call>

You can call ONE tool at a time. After each call, the system provides the result in a <tool_result> block.
Wait for the result before proceeding to the next step.`
    }
}

export class ChecklistBehaviorPart implements PromptPart {
    render(): string {
        return `## PROGRESS TRACKING

For complex tasks, maintain a checklist using the \`manage_todos\` tool:
- \`[ ]\` pending  \`[>]\` in-progress  \`[x]\` completed
- Format: \`[status] Task Name <- context\`

Update the checklist as you make progress. The user sees it in real-time.`
    }
}

export class PersonaPart implements PromptPart {
    constructor(private persona: string) { }

    render(): string {
        return `## YOUR PERSONA\n\n${this.persona}`
    }
}

// ─── Builder ─────────────────────────────────────────────────────────────────

export class PromptBuilder {
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
