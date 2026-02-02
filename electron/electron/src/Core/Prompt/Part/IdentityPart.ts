import { PromptPart } from './PromptPart';

export class IdentityPart implements PromptPart {
  constructor(private userName: string) {}
  render() {
    return `You are MOSAIC, a highly capable AI agent operating in a terminal-like environment.
Your goal is to assist the user, ${this.userName}, by executing tools and providing information.`;
  }
}
