import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { BaseTool } from './base';

interface Todo {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  createdAt: string;
}

export class TodoManager {
  private _todoFile: string | null;

  constructor(workspacePath: string) {
    const mosaicDir = workspacePath ? path.join(workspacePath, '.mosaic') : null;
    if (mosaicDir && !fs.existsSync(mosaicDir)) {
      fs.mkdirSync(mosaicDir, { recursive: true });
    }
    this._todoFile = mosaicDir ? path.join(mosaicDir, 'todos.json') : null;
  }

  public getTodos(): Todo[] {
    if (!this._todoFile || !fs.existsSync(this._todoFile)) return [];
    try {
      return JSON.parse(fs.readFileSync(this._todoFile, 'utf-8'));
    } catch (e) {
      return [];
    }
  }

  public saveTodos(todos: Todo[]) {
    if (this._todoFile) {
      fs.writeFileSync(this._todoFile, JSON.stringify(todos, null, 2));
    }
  }

  public add(title: string, description?: string): Todo {
    const todos = this.getTodos();
    const todo: Todo = {
      id: Math.random().toString(36).substr(2, 6),
      title,
      description,
      status: 'todo',
      createdAt: new Date().toISOString()
    };
    todos.push(todo);
    this.saveTodos(todos);
    return todo;
  }

  public update(id: string, updates: Partial<Todo>): Todo | null {
    const todos = this.getTodos();
    const idx = todos.findIndex(t => t.id === id);
    if (idx === -1) return null;
    todos[idx] = { ...todos[idx], ...updates };
    this.saveTodos(todos);
    return todos[idx];
  }

  public delete(id: string): boolean {
    const todos = this.getTodos();
    const filtered = todos.filter(t => t.id !== id);
    if (filtered.length === todos.length) return false;
    this.saveTodos(filtered);
    return true;
  }
  public clearAll() {
    if (this._todoFile && fs.existsSync(this._todoFile)) {
      fs.unlinkSync(this._todoFile);
    }
  }
}

function formatTodoList(todos: Todo[]): string {
  if (todos.length === 0) return "No active tasks.";
  const tasksXml = todos.map(t => 
    `<task id="${t.id}" status="${t.status}">${t.title}</task>`
  ).join('\n');
  return `<todo_list>\n${tasksXml}\n</todo_list>`;
}

export class CreateTodoTool extends BaseTool {
  name() { return 'create_todo'; }
  description() { return 'Add a new task to your todo list. Keep titles concise.'; }
  schema() {
    return {
      type: "object",
      properties: {
        title: { type: "string", description: "Short title of the task" },
        description: { type: "string", description: "Optional detailed description" }
      },
      required: ["title"]
    };
  }
  async execute(args: { title: string; description?: string }) {
    const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!workspacePath) return this.formatError("No workspace folder open");
    const manager = new TodoManager(workspacePath);
    manager.add(args.title, args.description);
    return formatTodoList(manager.getTodos());
  }
}

export class UpdateTodoTool extends BaseTool {
  name() { return 'update_todo'; }
  description() { return 'Update a task status or details. Status can be "todo", "in_progress", or "done".'; }
  schema() {
    return {
      type: "object",
      properties: {
        id: { type: "string", description: "The unique ID of the task to update" },
        status: { type: "string", enum: ["todo", "in_progress", "done"], description: "New status" },
        title: { type: "string", description: "New title" },
        description: { type: "string", description: "New description" }
      },
      required: ["id"]
    };
  }
  async execute(args: { id: string; status?: 'todo' | 'in_progress' | 'done'; title?: string; description?: string }) {
    const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!workspacePath) return this.formatError("No workspace folder open");
    const manager = new TodoManager(workspacePath);
    manager.update(args.id, args);
    return formatTodoList(manager.getTodos());
  }
}

export class ListTodosTool extends BaseTool {
  name() { return 'list_todos'; }
  description() { return 'List all tasks in your todo list to track progress.'; }
  schema() {
    return {
      type: "object",
      properties: {}
    };
  }
  async execute() {
    const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!workspacePath) return this.formatError("No workspace folder open");
    const manager = new TodoManager(workspacePath);
    return formatTodoList(manager.getTodos());
  }
}

export class DeleteTodoTool extends BaseTool {
  name() { return 'delete_todo'; }
  description() { return 'Remove a task from the todo list.'; }
  schema() {
    return {
      type: "object",
      properties: {
        id: { type: "string", description: "The unique ID of the task to delete" }
      },
      required: ["id"]
    };
  }
  async execute(args: { id: string }) {
    const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!workspacePath) return this.formatError("No workspace folder open");
    const manager = new TodoManager(workspacePath);
    manager.delete(args.id);
    return formatTodoList(manager.getTodos());
  }
}

export class ClearTodosTool extends BaseTool {
  name() { return 'clear_todos'; }
  description() { return 'Clear all tasks from the todo list. Use this at the start of a new major task.'; }
  schema() {
    return {
      type: "object",
      properties: {}
    };
  }
  async execute() {
    const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!workspacePath) return this.formatError("No workspace folder open");
    const manager = new TodoManager(workspacePath);
    manager.clearAll();
    return "Todo list cleared.";
  }
}
