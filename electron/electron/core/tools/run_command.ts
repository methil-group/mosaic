import { execSync } from 'child_process'
import type { Tool, ToolExample } from './types'
import { ToolCategory } from './types'
import { truncateResult } from './utils'

class RunCommandTool implements Tool {
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
        return [{ description: 'Run tests', xml: '<tool_call>\n{"name": "run_command", "arguments": {"command": "npm test"}}\n</tool_call>' }]
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

export default RunCommandTool
