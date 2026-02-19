import * as fs from 'fs'
import * as path from 'path'
import type { Tool, ToolExample } from './types'
import { ToolCategory } from './types'
import { resolvePath } from './utils'

class WriteFileTool implements Tool {
    name() { return 'write_file' }
    description() { return 'Create or overwrite a file with the specified content. Use for NEW files only. For modifications, prefer edit_file.' }
    category() { return ToolCategory.FileSystem }
    isDestructive() { return true }
    parameters() {
        return JSON.stringify({
            properties: {
                path: { type: 'string', description: 'Path to the file' },
                content: { type: 'string', description: 'Full file content to write' },
            },
            required: ['path', 'content'],
        })
    }
    examples(): ToolExample[] {
        return [{ description: 'Create a new file', xml: '<tool_call>\n  <name>write_file</name>\n  <parameters>\n    <path>hello.txt</path>\n    <content>Hello World</content>\n  </parameters>\n</tool_call>' }]
    }
    async execute(params: Record<string, string>, workspace: string): Promise<string> {
        const filePath = resolvePath(params.path || '', workspace)
        const dir = path.dirname(filePath)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(filePath, params.content || '', 'utf-8')
        return `File written: ${filePath}`
    }
}

export default WriteFileTool
