import { Tool } from './Tool';

export class ManageTodosTool extends Tool {
  name = 'manage_todos';
  description = 'Manage a list of todo items. Use this to track progress on multi-step tasks.';
  parameters = JSON.stringify({
    type: 'object',
    properties: {
      checklist: { 
        type: 'string', 
        description: 'The full list of tasks in the format: [x] completed, [>] in progress, [ ] pending. Use <- to add context, e.g., [>] Task Name <- details' 
      }
    },
    required: ['checklist']
  });

  async execute(params: any, _workspace: string): Promise<string> {
    if (!params.checklist || params.checklist.trim() === '') {
      throw new Error('Checklist cannot be empty. Please provide the full updated checklist.');
    }
    return params.checklist;
  }
}
