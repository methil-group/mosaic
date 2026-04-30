import * as fs from 'fs';
import * as path from 'path';
import { OpenRouterProvider } from '../src/framework/llm/provider';
import { Agent } from '../src/core/agent';
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

const API_KEY = "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";
const MODEL = "qwen/qwen-2.5-32b-instruct"; // Chemin OpenRouter pour Qwen 32B ou équivalent

async function runBenchmark() {
  console.log("🚀 Starting Mosaic Benchmark Suite...");
  
  const tasks = JSON.parse(fs.readFileSync(path.join(__dirname, 'tasks.json'), 'utf-8'));
  const provider = new OpenRouterProvider(API_KEY);
  const workspacePath = path.resolve(__dirname, '..');

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
    if (task.workspace) console.log(`📂 Workspace: ${task.workspace}`);
    console.log(`--------------------------------------------------`);

    const currentWorkspacePath = task.workspace 
        ? path.join(__dirname, 'workspaces', task.workspace)
        : workspacePath;

    const agent = new Agent(
      provider,
      MODEL,
      currentWorkspacePath,
      "BenchmarkBot",
      tools
    );

    // Mock progress reporting
    const onProgress = (content: string) => {
      process.stdout.write(content);
    };

    try {
      const startTime = Date.now();
      await agent.chat(task.prompt, onProgress);
      const duration = (Date.now() - startTime) / 1000;
      
      console.log(`\n\n✅ Task completed in ${duration.toFixed(2)}s`);
    } catch (error) {
      console.error(`\n\n❌ Task failed:`, error);
    }
  }

  console.log("\n✨ Benchmark finished!");
}

runBenchmark().catch(console.error);
