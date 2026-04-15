import * as fs from 'fs'
import type { Tool, ToolExample } from './types'
import { ToolCategory } from './types'
import { resolvePath, truncateResult } from './utils'

class ReadFileTool implements Tool {
    name() { return 'read_file' }
    description() { return 'Read the contents of a file. Returns the full file content with line numbers.' }
    category() { return ToolCategory.FileSystem }
    isDestructive() { return false }
    parameters() {
        return JSON.stringify({
            properties: {
                path: { type: 'string', description: 'Path to the file (relative to workspace or absolute)' },
            },
            required: ['path'],
        })
    }
    examples(): ToolExample[] {
        return [{ description: 'Read a config file', xml: '<tool_call>\n{"name": "read_file", "arguments": {"path": "src/config.ts"}}\n</tool_call>' }]
    }
    async execute(params: Record<string, string>, workspace: string): Promise<string> {
        const filePath = resolvePath(params.path || '', workspace)
        if (!fs.existsSync(filePath)) return `Error: File not found: ${filePath}`
        const content = fs.readFileSync(filePath, 'utf-8')
        const lines = content.split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n')
        return truncateResult(lines)
    }
}

export default ReadFileTool
