import type { Tool } from './types'
import ReadFileTool from './read_file'
import WriteFileTool from './write_file'
import EditFileTool from './edit_file'
import RunCommandTool from './run_command'
import SearchFilesTool from './search_files'
import ListDirectoryTool from './list_directory'
import ManageTodosTool from './manage_todos'

export type { Tool, ToolExample } from './types'
export { ToolCategory } from './types'

class ToolRegistry {
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

export default ToolRegistry

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
