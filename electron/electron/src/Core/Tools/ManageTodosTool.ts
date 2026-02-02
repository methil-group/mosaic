import { Tool } from './Tool';

export class ManageTodosTool extends Tool {
  name = 'manage_todos';
  description = 'Manage a list of todo items. Use this to track progress on multi-step tasks. Provide a conclusion once the task is finished.';
  parameters = JSON.stringify({
    type: 'object',
    properties: {
      todos: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            task: { type: 'string', description: 'Description of the task.' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed'], description: 'Status of the task.' },
            context: { type: 'string', description: 'Active form context (required for in_progress tasks, empty otherwise).' }
          },
          required: ['task', 'status', 'context']
        }
      },
      conclusion: { type: 'string', description: 'Optional final comment or summary of completed work.' }
    },
    required: ['todos']
  });

  async execute(params: any, _workspace: string): Promise<string> {
    return JSON.stringify(params);
  }
}
