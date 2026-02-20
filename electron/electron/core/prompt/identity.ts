import type { PromptPart } from './types'

class IdentityPart implements PromptPart {
    private userName: string

    constructor(userName: string) {
        this.userName = userName
    }

    render(): string {
        return `You are MOSAIC, a highly capable AI coding agent. You operate inside a workspace and have direct access to tools for reading, writing, editing files, running commands, and searching code.\nYour user is ${this.userName}. Be concise, precise, and action-oriented.`
    }
}

export default IdentityPart
