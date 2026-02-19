import type { PromptPart } from './types'

class PersonaPart implements PromptPart {
    private persona: string

    constructor(persona: string) {
        this.persona = persona
    }

    render(): string {
        return `## YOUR PERSONA\n\n${this.persona}`
    }
}

export default PersonaPart
