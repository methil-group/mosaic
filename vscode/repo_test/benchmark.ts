import * as path from 'path';

// --- MODULE ALIAS SETUP ---
// This MUST happen before any imports of modules that use 'vscode'
const moduleAlias = require('module-alias');
moduleAlias.addAlias('vscode', path.join(__dirname, 'shims', 'vscode'));

import * as fs from 'fs';
import * as vscode from 'vscode';
import { OpenRouterProvider } from '../src/framework/llm/provider';
import { Agent, StreamEvent } from '../src/core/agent';
import { 
  ReadFileTool, 
  WriteFileTool, 
  EditFileTool, 
  ListDirectoryTool 
} from '../src/core/tools/fileTools';
import { RunCommandTool } from '../src/core/tools/runCommand';
import { 
  CreateTodoTool, 
  UpdateTodoTool, 
  ListTodosTool, 
  DeleteTodoTool, 
  ClearTodosTool 
} from '../src/core/tools/todoTools';

// This allows us to change the workspace path dynamically between tasks
const setMockPath = (p: string) => {
    (vscode.workspace as any).workspaceFolders = [{
        uri: { fsPath: p },
        name: 'BenchmarkWorkspace',
        index: 0
    }];
};

require('dotenv').config();

const API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = "qwen/qwen-2.5-coder-32b-instruct"; 

if (!API_KEY) {
  console.error("❌ OPENROUTER_API_KEY not found in .env file");
  process.exit(1);
}

async function runBenchmark() {
  console.log("🚀 Starting Mosaic Benchmark Suite...");
  
  const tasksPath = path.join(__dirname, 'tasks.json');
  const tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf-8'));
  const provider = new OpenRouterProvider(API_KEY);

  const tools = [
    new ReadFileTool(),
    new WriteFileTool(),
    new EditFileTool(),
    new ListDirectoryTool(),
    new RunCommandTool(),
    new CreateTodoTool(),
    new UpdateTodoTool(),
    new ListTodosTool(),
    new DeleteTodoTool(),
    new ClearTodosTool()
  ];

  for (const task of tasks) {
    console.log(`\n--------------------------------------------------`);
    console.log(`📝 Task: ${task.name} (${task.id})`);
    console.log(`🤖 Model: ${task.model || MODEL}`);
    if (task.workspace) console.log(`📂 Workspace: ${task.workspace}`);
    console.log(`--------------------------------------------------`);

    // Update the mock path for this specific task
    const currentPath = task.workspace 
        ? path.join(__dirname, 'workspaces', task.workspace)
        : path.resolve(__dirname, '..');
    setMockPath(currentPath);

    const agent = new Agent(
      provider,
      MODEL,
      task.workspace || "MainRepo",
      "BenchUser",
      tools
    );

    const onEvent = async (event: StreamEvent) => {
      if (event.type === "token") {
        process.stdout.write(event.data);
      } else if (event.type === "log") {
        if (event.message && event.message.includes("Internal User Nudge")) {
            console.log(`\n⚠️  Nudge: ${event.message.split('Internal User Nudge:')[1]}`);
        }
      } else if (event.type === "tool_started") {
        console.log(`\n🛠️  Tool Started: ${event.name}`);
      } else if (event.type === "tool_finished") {
        console.log(`\n✅ Tool Finished: ${event.name}`);
        const resStr = typeof event.result === 'string' ? event.result : JSON.stringify(event.result);
        console.log(`📦 Result: ${resStr.substring(0, 200)}${resStr.length > 200 ? '...' : ''}`);
      } else if (event.type === "error") {
        console.error(`\n❌ Agent Error: ${event.message}`);
      }
    };

    try {
      const startTime = Date.now();
      await agent.run(task.prompt, onEvent);
      const duration = (Date.now() - startTime) / 1000;
      
      const lastMsg = (agent as any).messages[(agent as any).messages.length - 1];
      const finalContent = lastMsg?.content || "";
      const health = validateResult(finalContent);

      console.log(`\n\n✨ Task completed in ${duration.toFixed(2)}s`);
      console.log(`🧹 Cleanliness Score: ${health.score}/100`);
      if (health.issues.length > 0) {
        console.log(`⚠️  Issues: ${health.issues.join(', ')}`);
      }
    } catch (error) {
      console.error(`\n\n💥 Critical failure:`, error);
    }
  }

  console.log("\n🏁 All benchmarks finished!");
}

function validateResult(content: string) {
    const issues: string[] = [];
    let score = 100;

    if (content.includes('<thought>') && !content.includes('</thought>')) {
        issues.push("Unclosed <thought> tag");
        score -= 20;
    }
    if (content.includes('<tool_call>') && !content.includes('</tool_call>')) {
        issues.push("Unclosed <tool_call> tag");
        score -= 30;
    }
    if (content.includes('```json')) {
        issues.push("Found markdown JSON blocks (should be raw or XML)");
        score -= 10;
    }
    if (content.length === 0) {
        issues.push("Empty response");
        score = 0;
    }

    return { score, issues };
}

runBenchmark().catch(console.error);
