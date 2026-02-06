import { PromptPart } from './PromptPart';

export class WorkspaceContextPart implements PromptPart {
  constructor(private workspace: string) {}
  render() {
    return `CURRENT WORKSPACE: ${this.workspace}
You have full access to this directory. Use 'run_bash' to explore or 'read_file' to understand the code.

IMPORTANT: You are already in the root of the workspace. 
- DO NOT use the absolute path "${this.workspace}" in your tool calls.
- ALWAYS use relative paths (e.g. "src/index.ts" instead of "${this.workspace}/src/index.ts").`;
  }
}
