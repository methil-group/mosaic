import * as fs from 'fs'
import * as path from 'path'
import type { Tool, ToolExample } from './types'
import { ToolCategory } from './types'
import { resolvePath, truncateResult, globToRegex } from './utils'

class SearchFilesTool implements Tool {
    name() { return 'search_files' }
    description() { return 'Search for a pattern in all files recursively. Returns matching lines with file paths and line numbers.' }
    category() { return ToolCategory.CodeIntelligence }
    isDestructive() { return false }
    parameters() {
        return JSON.stringify({
            properties: {
                pattern: { type: 'string', description: 'Text or regex pattern to search for' },
                path: { type: 'string', description: 'Directory to search in (default: workspace root)' },
                file_pattern: { type: 'string', description: 'Glob pattern to filter files, e.g. "*.ts"' },
            },
            required: ['pattern'],
        })
    }
    examples(): ToolExample[] {
        return [{ description: 'Find all TODO comments', xml: '<tool_call>\n{"name": "search_files", "arguments": {"pattern": "TODO"}}\n</tool_call>' }]
    }
    async execute(params: Record<string, string>, workspace: string): Promise<string> {
        const searchPath = resolvePath(params.path || '.', workspace)
        const pattern = params.pattern || ''
        const excludeDirs = ['node_modules', '.git', 'target', 'dist', '.nuxt', '.output', '__pycache__']
        const results: string[] = []

        const searchDir = (dir: string) => {
            if (results.length > 100) return
            let entries: fs.Dirent[]
            try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }

            for (const entry of entries) {
                if (results.length > 100) break
                if (excludeDirs.includes(entry.name)) continue
                const full = path.join(dir, entry.name)

                if (entry.isDirectory()) {
                    searchDir(full)
                } else if (entry.isFile()) {
                    if (params.file_pattern && !entry.name.match(globToRegex(params.file_pattern))) continue
                    try {
                        const content = fs.readFileSync(full, 'utf-8')
                        const lines = content.split('\n')
                        for (let i = 0; i < lines.length; i++) {
                            if (lines[i].includes(pattern)) {
                                const rel = path.relative(workspace, full)
                                results.push(`${rel}:${i + 1}: ${lines[i].trim()}`)
                            }
                        }
                    } catch { /* binary or unreadable */ }
                }
            }
        }

        searchDir(searchPath)
        if (results.length === 0) return `No matches found for "${pattern}"`
        return truncateResult(results.join('\n'))
    }
}

export default SearchFilesTool
