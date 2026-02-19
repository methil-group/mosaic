import * as fs from 'fs'
import type { Tool, ToolExample } from './types'
import { ToolCategory } from './types'
import { resolvePath } from './utils'

class EditFileTool implements Tool {
    name() { return 'edit_file' }
    description() { return 'Perform a surgical find-and-replace in a file. ALWAYS read the file first to get the exact content to replace.' }
    category() { return ToolCategory.FileSystem }
    isDestructive() { return true }
    parameters() {
        return JSON.stringify({
            properties: {
                path: { type: 'string', description: 'Path to the file' },
                old_content: { type: 'string', description: 'Exact content to find (must match exactly)' },
                new_content: { type: 'string', description: 'Replacement content' },
            },
            required: ['path', 'old_content', 'new_content'],
        })
    }
    examples(): ToolExample[] {
        return [{ description: 'Replace a function name', xml: '<tool_call>\n  <name>edit_file</name>\n  <parameters>\n    <path>src/utils.ts</path>\n    <old_content>function oldName()</old_content>\n    <new_content>function newName()</new_content>\n  </parameters>\n</tool_call>' }]
    }
    async execute(params: Record<string, string>, workspace: string): Promise<string> {
        const filePath = resolvePath(params.path || '', workspace)
        if (!fs.existsSync(filePath)) return `Error: File not found: ${filePath}`
        const content = fs.readFileSync(filePath, 'utf-8')
        const oldContent = params.old_content || ''
        const newContent = params.new_content ?? ''
        const count = content.split(oldContent).length - 1
        if (count === 0) return `Error: old_content not found in file. Read the file first to get exact content.`
        if (count > 1) return `Error: old_content found ${count} times. Make it more specific to match exactly once.`
        fs.writeFileSync(filePath, content.replace(oldContent, newContent), 'utf-8')
        return `File edited successfully: ${filePath}`
    }
}

export default EditFileTool
