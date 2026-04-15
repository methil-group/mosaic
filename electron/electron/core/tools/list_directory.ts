import * as fs from 'fs'
import * as path from 'path'
import type { Tool, ToolExample } from './types'
import { ToolCategory } from './types'
import { resolvePath, formatSize } from './utils'

class ListDirectoryTool implements Tool {
    name() { return 'list_directory' }
    description() { return 'List files and directories in a path. Shows file sizes and types.' }
    category() { return ToolCategory.FileSystem }
    isDestructive() { return false }
    parameters() {
        return JSON.stringify({
            properties: {
                path: { type: 'string', description: 'Directory path (default: workspace root)' },
                recursive: { type: 'string', description: 'If "true", list recursively (max 3 levels)' },
            },
            required: [],
        })
    }
    examples(): ToolExample[] {
        return [{ description: 'List project root', xml: '<tool_call>\n{"name": "list_directory", "arguments": {"path": "."}}\n</tool_call>' }]
    }
    async execute(params: Record<string, string>, workspace: string): Promise<string> {
        const dirPath = resolvePath(params.path || '.', workspace)
        const recursive = params.recursive === 'true'
        const excludeDirs = ['node_modules', '.git', 'target', 'dist', '.nuxt', '.output']
        const lines: string[] = []

        const listDir = (dir: string, prefix: string, depth: number) => {
            if (lines.length > 200) return
            let entries: fs.Dirent[]
            try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }

            entries.sort((a, b) => {
                if (a.isDirectory() && !b.isDirectory()) return -1
                if (!a.isDirectory() && b.isDirectory()) return 1
                return a.name.localeCompare(b.name)
            })

            for (const entry of entries) {
                if (excludeDirs.includes(entry.name)) continue
                const full = path.join(dir, entry.name)

                if (entry.isDirectory()) {
                    lines.push(`${prefix}📁 ${entry.name}/`)
                    if (recursive && depth < 3) listDir(full, prefix + '  ', depth + 1)
                } else {
                    try {
                        const stat = fs.statSync(full)
                        const size = formatSize(stat.size)
                        lines.push(`${prefix}📄 ${entry.name} (${size})`)
                    } catch {
                        lines.push(`${prefix}📄 ${entry.name}`)
                    }
                }
            }
        }

        listDir(dirPath, '', 0)
        if (lines.length === 0) return `Directory is empty or does not exist: ${dirPath}`
        return lines.join('\n')
    }
}

export default ListDirectoryTool
