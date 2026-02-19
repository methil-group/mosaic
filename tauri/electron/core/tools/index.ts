import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

// ─── Types ───────────────────────────────────────────────────────────────────

export enum ToolCategory {
    FileSystem = 'FileSystem',
    CodeIntelligence = 'CodeIntelligence',
    Execution = 'Execution',
    Communication = 'Communication',
    General = 'General',
}

export interface ToolExample {
    description: string
    xml: string
}

export interface Tool {
    name(): string
    description(): string
    parameters(): string // JSON schema string
    execute(params: Record<string, string>, workspace: string): Promise<string>
    examples(): ToolExample[]
    category(): ToolCategory
    isDestructive(): boolean
}

// ─── Utilities ───────────────────────────────────────────────────────────────

export function resolvePath(filePath: string, workspace: string): string {
    if (path.isAbsolute(filePath)) return filePath
    return path.join(workspace, filePath)
}

export function truncateResult(result: string, maxLen = 8000): string {
    if (result.length <= maxLen) return result
    const half = Math.floor(maxLen / 2)
    return result.slice(0, half) + `\n\n... [truncated ${result.length - maxLen} characters] ...\n\n` + result.slice(-half)
}

// ─── Tool Implementations ────────────────────────────────────────────────────

export class ReadFileTool implements Tool {
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
        return [{ description: 'Read a config file', xml: '<tool_call>\n  <name>read_file</name>\n  <parameters>\n    <path>src/config.ts</path>\n  </parameters>\n</tool_call>' }]
    }
    async execute(params: Record<string, string>, workspace: string): Promise<string> {
        const filePath = resolvePath(params.path || '', workspace)
        if (!fs.existsSync(filePath)) return `Error: File not found: ${filePath}`
        const content = fs.readFileSync(filePath, 'utf-8')
        const lines = content.split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n')
        return truncateResult(lines)
    }
}

export class WriteFileTool implements Tool {
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

export class EditFileTool implements Tool {
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

export class RunCommandTool implements Tool {
    name() { return 'run_command' }
    description() { return 'Execute a shell command in the workspace directory. Use for builds, tests, git, etc.' }
    category() { return ToolCategory.Execution }
    isDestructive() { return true }
    parameters() {
        return JSON.stringify({
            properties: {
                command: { type: 'string', description: 'Shell command to execute' },
                timeout: { type: 'string', description: 'Timeout in seconds (default: 30)' },
            },
            required: ['command'],
        })
    }
    examples(): ToolExample[] {
        return [{ description: 'Run tests', xml: '<tool_call>\n  <name>run_command</name>\n  <parameters>\n    <command>npm test</command>\n  </parameters>\n</tool_call>' }]
    }
    async execute(params: Record<string, string>, workspace: string): Promise<string> {
        const timeout = parseInt(params.timeout || '30') * 1000
        try {
            const output = execSync(params.command || 'echo "no command"', {
                cwd: workspace,
                timeout,
                encoding: 'utf-8',
                maxBuffer: 1024 * 1024,
                stdio: ['pipe', 'pipe', 'pipe'],
            })
            return truncateResult(`Exit code: 0\n\n${output}`)
        } catch (err: any) {
            const stdout = err.stdout || ''
            const stderr = err.stderr || ''
            const code = err.status ?? 1
            return truncateResult(`Exit code: ${code}\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`)
        }
    }
}

export class SearchFilesTool implements Tool {
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
        return [{ description: 'Find all TODO comments', xml: '<tool_call>\n  <name>search_files</name>\n  <parameters>\n    <pattern>TODO</pattern>\n  </parameters>\n</tool_call>' }]
    }
    async execute(params: Record<string, string>, workspace: string): Promise<string> {
        const searchPath = resolvePath(params.path || '.', workspace)
        const pattern = params.pattern || ''
        const excludeDirs = ['node_modules', '.git', 'target', 'dist', '.nuxt', '.output', '__pycache__']

        const results: string[] = []

        function searchDir(dir: string) {
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

function globToRegex(glob: string): RegExp {
    const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')
    return new RegExp(`^${escaped}$`)
}

export class ListDirectoryTool implements Tool {
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
        return [{ description: 'List project root', xml: '<tool_call>\n  <name>list_directory</name>\n  <parameters>\n    <path>.</path>\n  </parameters>\n</tool_call>' }]
    }
    async execute(params: Record<string, string>, workspace: string): Promise<string> {
        const dirPath = resolvePath(params.path || '.', workspace)
        const recursive = params.recursive === 'true'
        const excludeDirs = ['node_modules', '.git', 'target', 'dist', '.nuxt', '.output']
        const lines: string[] = []

        function listDir(dir: string, prefix: string, depth: number) {
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

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export class ManageTodosTool implements Tool {
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

// ─── Registry ────────────────────────────────────────────────────────────────

export class ToolRegistry {
    private tools: Tool[]

    constructor(tools: Tool[]) {
        this.tools = tools
    }

    getTools(): Tool[] {
        return this.tools
    }

    find(name: string): Tool | undefined {
        return this.tools.find(t => t.name() === name)
    }
}

export function getDefaultTools(): ToolRegistry {
    return new ToolRegistry([
        new ReadFileTool(),
        new WriteFileTool(),
        new EditFileTool(),
        new RunCommandTool(),
        new SearchFilesTool(),
        new ListDirectoryTool(),
        new ManageTodosTool(),
    ])
}
