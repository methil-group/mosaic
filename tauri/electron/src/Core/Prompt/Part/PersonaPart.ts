import { PromptPart } from './PromptPart';

export class PersonaPart implements PromptPart {
  constructor(private persona: string) {}
  render() {
    return `## YOUR PERSONA

${this.persona}`;
  }
}
