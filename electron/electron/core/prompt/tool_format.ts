import type { PromptPart } from './types'
import type { Tool } from '../tools/types'
import { ToolCategory } from '../tools/types'

class ToolFormatPart implements PromptPart {
    private tools: Tool[]

    constructor(tools: Tool[]) {
        this.tools = tools
    }

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

export default ToolFormatPart
