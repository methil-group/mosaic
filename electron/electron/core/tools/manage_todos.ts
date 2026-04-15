import type { Tool, ToolExample } from './types'
import { ToolCategory } from './types'

class ManageTodosTool implements Tool {
    name() { return 'manage_todos' }
    description() { return 'Track your progress with a checklist. Create and update task lists visible to the user.' }
    category() { return ToolCategory.General }
    isDestructive() { return false }
    parameters() {
        return JSON.stringify({
            properties: {
                checklist: { type: 'string', description: 'Full checklist in markdown format, e.g. "- [x] Done\\n- [ ] Pending"' },
            },
            required: ['checklist'],
        })
    }
    examples(): ToolExample[] { return [] }
    async execute(params: Record<string, string>): Promise<string> {
        return `Checklist updated:\n${params.checklist || '(empty)'}`
    }
}

export default ManageTodosTool
