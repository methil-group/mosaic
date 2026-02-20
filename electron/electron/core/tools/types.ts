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
    parameters(): string
    execute(params: Record<string, string>, workspace: string): Promise<string>
    examples(): ToolExample[]
    category(): ToolCategory
    isDestructive(): boolean
}
