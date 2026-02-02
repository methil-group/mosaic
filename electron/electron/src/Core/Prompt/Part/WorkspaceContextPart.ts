import { PromptPart } from './PromptPart';

export class WorkspaceContextPart implements PromptPart {
  constructor(private workspace: string) {}
  render() {
    return `CURRENT WORKSPACE: ${this.workspace}
You have full access to this directory. Use 'run_bash' to explore or 'read_file' to understand the code.`;
  }
}
