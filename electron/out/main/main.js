import { app, BrowserWindow, ipcMain } from "electron";
import { dirname as dirname$1, join as join$1 } from "path";
import { fileURLToPath } from "url";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs/promises";
import { join, dirname } from "node:path";
import * as os from "node:os";
import axios from "axios";
import * as dotenv from "dotenv";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
const is = {
  dev: !app.isPackaged
};
({
  isWindows: process.platform === "win32",
  isMacOS: process.platform === "darwin",
  isLinux: process.platform === "linux"
});
const execPromise = promisify(exec);
class Tool {
  expandPath(path) {
    if (path.startsWith("~/")) {
      return join(os.homedir(), path.slice(2));
    }
    if (path === "~") {
      return os.homedir();
    }
    return path;
  }
}
class BashTool extends Tool {
  constructor() {
    super(...arguments);
    this.name = "run_bash";
    this.description = "Run a shell command. Use for: ls, find, grep, git, npm, python, etc.";
    this.parameters = JSON.stringify({
      type: "object",
      properties: {
        command: { type: "string", description: "The bash command to run." }
      },
      required: ["command"]
    });
  }
  async execute(params, workspace) {
    const fullWorkspace = this.expandPath(workspace);
    try {
      const { stdout, stderr } = await execPromise(params.command, { cwd: fullWorkspace });
      return stdout + (stderr ? `
Error output:
${stderr}` : "");
    } catch (error) {
      return `Execution failed: ${error.message}${error.stdout ? `
Output before failure:
${error.stdout}` : ""}`;
    }
  }
}
class ReadFileTool extends Tool {
  constructor() {
    super(...arguments);
    this.name = "read_file";
    this.description = "Read the contents of a file at the given path.";
    this.parameters = JSON.stringify({
      type: "object",
      properties: {
        path: { type: "string", description: "Path to the file to read." }
      },
      required: ["path"]
    });
  }
  async execute(params, workspace) {
    const fullPath = this.expandPath(params.path);
    const absolutePath = join(this.expandPath(workspace), fullPath);
    try {
      return await fs.readFile(absolutePath, "utf8");
    } catch (error) {
      return `Error reading file: ${error.message}`;
    }
  }
}
class WriteFileTool extends Tool {
  constructor() {
    super(...arguments);
    this.name = "write_file";
    this.description = "Write content to a file. Warning: This overwrites existing content.";
    this.parameters = JSON.stringify({
      type: "object",
      properties: {
        path: { type: "string", description: "Path where the file will be written." },
        content: { type: "string", description: "The content to write to the file." }
      },
      required: ["path", "content"]
    });
  }
  async execute(params, workspace) {
    const fullPath = this.expandPath(params.path);
    const absolutePath = join(this.expandPath(workspace), fullPath);
    try {
      await fs.mkdir(dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, params.content, "utf8");
      return "File written successfully";
    } catch (error) {
      return `Error writing file: ${error.message}`;
    }
  }
}
class ReplaceContentTool extends Tool {
  constructor() {
    super(...arguments);
    this.name = "replace_content";
    this.description = "Replace occurrences of old text with new text in a file.";
    this.parameters = JSON.stringify({
      type: "object",
      properties: {
        path: { type: "string", description: "Path to the file to modify." },
        old_text: { type: "string", description: "The text to be replaced." },
        new_text: { type: "string", description: "The text to replace with." }
      },
      required: ["path", "old_text", "new_text"]
    });
  }
  async execute(params, workspace) {
    const absolutePath = join(this.expandPath(workspace), this.expandPath(params.path));
    try {
      const content = await fs.readFile(absolutePath, "utf8");
      const newContent = content.split(params.old_text).join(params.new_text);
      if (content === newContent) {
        return "Warning: Old text not found in file.";
      }
      await fs.writeFile(absolutePath, newContent, "utf8");
      return "Content replaced successfully";
    } catch (error) {
      return `Error replacing content: ${error.message}`;
    }
  }
}
class InsertLineTool extends Tool {
  constructor() {
    super(...arguments);
    this.name = "insert_line";
    this.description = "Insert a single line of text at a specific line number (1-indexed).";
    this.parameters = JSON.stringify({
      type: "object",
      properties: {
        path: { type: "string", description: "Path to the file to modify." },
        line: { type: "integer", description: "The line number (1-indexed) where content will be inserted." },
        content: { type: "string", description: "The text to insert." }
      },
      required: ["path", "line", "content"]
    });
  }
  async execute(params, workspace) {
    const absolutePath = join(this.expandPath(workspace), this.expandPath(params.path));
    try {
      const content = await fs.readFile(absolutePath, "utf8");
      const lines = content.split("\n");
      const index = Math.max(0, params.line - 1);
      lines.splice(index, 0, params.content);
      await fs.writeFile(absolutePath, lines.join("\n"), "utf8");
      return "Line inserted successfully";
    } catch (error) {
      return `Error inserting line: ${error.message}`;
    }
  }
}
class ManageTodosTool extends Tool {
  constructor() {
    super(...arguments);
    this.name = "manage_todos";
    this.description = "Manage a list of todo items. Use this to track progress on multi-step tasks. Provide a conclusion once the task is finished.";
    this.parameters = JSON.stringify({
      type: "object",
      properties: {
        todos: {
          type: "array",
          items: {
            type: "object",
            properties: {
              task: { type: "string", description: "Description of the task." },
              status: { type: "string", enum: ["pending", "in_progress", "completed"], description: "Status of the task." },
              context: { type: "string", description: "Active form context (required for in_progress tasks, empty otherwise)." }
            },
            required: ["task", "status", "context"]
          }
        },
        conclusion: { type: "string", description: "Optional final comment or summary of completed work." }
      },
      required: ["todos"]
    });
  }
  async execute(params, _workspace) {
    return JSON.stringify(params);
  }
}
function getTools() {
  return [
    new BashTool(),
    new ReadFileTool(),
    new WriteFileTool(),
    new ReplaceContentTool(),
    new InsertLineTool(),
    new ManageTodosTool()
  ];
}
class IdentityPart {
  constructor(userName) {
    this.userName = userName;
  }
  render() {
    return `You are MOSAIC, a highly capable AI agent operating in a terminal-like environment.
Your goal is to assist the user, ${this.userName}, by executing tools and providing information.`;
  }
}
class ToolFormatPart {
  constructor(tools) {
    this.tools = tools;
  }
  render() {
    const toolsJson = this.tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: JSON.parse(t.parameters)
    }));
    return `AVAILABLE TOOLS:
${JSON.stringify(toolsJson, null, 2)}

TOOL CALLING FORMAT:
To call a tool, use the following XML-like format:
<tool_call>
  <name>tool_name</name>
  <parameters>
    <param_name>value</param_name>
  </parameters>
</tool_call>

You can call only one tool at a time. After a tool call, the system will provide the result in a <tool_result> block.
Wait for the result before proceeding.`;
  }
}
class ChecklistBehaviorPart {
  render() {
    return `MODIFIED BEHAVIOR: CHECKLISTS
You MUST maintain a checklist of your progress using the 'manage_todos' tool.
1. When you start a complex task, initialize the checklist.
2. For every step you take, update the checklist status.
3. When you are done, provide a final conclusion in the 'manage_todos' call.
Always inform the user about the current state of the checklist.`;
  }
}
class WorkspaceContextPart {
  constructor(workspace) {
    this.workspace = workspace;
  }
  render() {
    return `CURRENT WORKSPACE: ${this.workspace}
You have full access to this directory. Use 'run_bash' to explore or 'read_file' to understand the code.`;
  }
}
class PromptBuilder {
  static createSystemPrompt(tools, workspace, userName) {
    const parts = [
      new IdentityPart(userName),
      new WorkspaceContextPart(workspace),
      new ToolFormatPart(tools),
      new ChecklistBehaviorPart()
    ];
    return parts.map((p) => p.render()).join("\n\n") + "\n\nIf you have a final answer, just provide it as plain text.";
  }
  static formatToolResult(name, result) {
    return `<tool_result name="${name}">
${result}
</tool_result>`;
  }
}
class Agent {
  constructor(llm, model, workspace, userName, onEvent) {
    this.llm = llm;
    this.model = model;
    this.workspace = workspace;
    this.userName = userName;
    this.onEvent = onEvent;
    this.messages = [];
    this.tools = getTools();
  }
  async run(userPrompt) {
    const systemPrompt = PromptBuilder.createSystemPrompt(this.tools, this.workspace, this.userName);
    this.messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];
    await this.reasoningLoop();
    console.log("[Agent] Run finished");
  }
  async reasoningLoop() {
    console.log("[Agent] Starting reasoning loop");
    let loop = true;
    try {
      while (loop) {
        const stepResult = await this.runStep();
        const contentWithoutTool = stepResult.content.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, "").trim();
        if (stepResult.toolCall) {
          const { name, parameters } = stepResult.toolCall;
          console.log(`[Agent] Tool call: ${name}`, parameters);
          this.onEvent({ type: "tool_started", name, parameters: JSON.stringify(parameters) });
          const tool = this.tools.find((t) => t.name === name);
          if (tool) {
            try {
              const result = await tool.execute(parameters, this.workspace);
              this.onEvent({ type: "tool_finished", name, result });
              if (contentWithoutTool) {
                this.messages.push({ role: "assistant", content: contentWithoutTool });
              }
              this.messages.push({ role: "user", content: PromptBuilder.formatToolResult(name, result) });
              console.log(`[Agent] Tool finished: ${name}`);
            } catch (error) {
              console.error(`[Agent] Tool error: ${name}`, error.message);
              this.onEvent({ type: "error", message: `Tool execution failed: ${error.message}` });
              loop = false;
            }
          } else {
            this.onEvent({ type: "error", message: `Tool ${name} not found` });
            loop = false;
          }
        } else {
          console.log("[Agent] Final answer received");
          this.onEvent({ type: "final_answer", data: contentWithoutTool || stepResult.content });
          loop = false;
        }
      }
    } catch (error) {
      console.error("[Agent] Logic error in reasoning loop:", error);
      this.onEvent({ type: "error", message: `Fatal error: ${error.message}` });
    }
  }
  async runStep() {
    console.log("[Agent] Running step...");
    return new Promise((resolve, reject) => {
      let accumulated = "";
      let isInsideToolCall = false;
      this.llm.streamChat(this.model, this.messages, {
        onToken: (token) => {
          accumulated += token;
          if (accumulated.includes("<tool_call>") && !isInsideToolCall) {
            isInsideToolCall = true;
          }
          if (!isInsideToolCall) {
            this.onEvent({ type: "token", data: token });
          }
          if (accumulated.includes("</tool_call>") && isInsideToolCall) {
            isInsideToolCall = false;
          }
        },
        onError: (error) => {
          this.onEvent({ type: "error", message: error });
          reject(new Error(error));
        },
        onComplete: (fullText) => {
          const toolCall = this.parseToolCall(fullText);
          resolve({ content: fullText, toolCall });
        }
      });
    });
  }
  parseToolCall(content) {
    const match = content.match(/<tool_call>([\s\S]*?)<\/tool_call>/);
    if (!match) return void 0;
    const xml = match[1];
    const nameMatch = xml.match(/<name>(.*?)<\/name>/);
    const paramsMatch = xml.match(/<parameters>([\s\S]*?)<\/parameters>/);
    if (!nameMatch) return void 0;
    const name = nameMatch[1].trim();
    const parameters = {};
    if (paramsMatch) {
      const paramsXml = paramsMatch[1];
      const paramMatches = paramsXml.matchAll(/<(.*?)>(.*?)<\/\1>/g);
      for (const m of paramMatches) {
        parameters[m[1]] = m[2].trim();
      }
    }
    return { name, parameters };
  }
}
class AbstractLLM {
}
class OpenRouter extends AbstractLLM {
  constructor(apiKey) {
    super();
    this.baseUrl = "https://openrouter.ai/api/v1";
    this.apiKey = apiKey;
  }
  async streamChat(model, messages, callbacks) {
    if (!this.apiKey) {
      callbacks.onError("OpenRouter API Key not found");
      return;
    }
    console.log(`[OpenRouter] Starting stream chat for model: ${model}`);
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model,
          messages,
          stream: true
        },
        {
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/methil-mods/mosaic",
            "X-Title": "Mosaic"
          },
          responseType: "stream"
        }
      );
      let accumulated = "";
      let buffer = "";
      response.data.on("data", (chunk) => {
        buffer += chunk.toString();
        let lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;
          if (trimmedLine.startsWith("data: ")) {
            const data = trimmedLine.slice(6);
            if (data === "[DONE]") {
              console.log("[OpenRouter] Stream finished [DONE]");
              callbacks.onComplete(accumulated);
              return;
            }
            try {
              const json = JSON.parse(data);
              const token = json.choices[0]?.delta?.content || "";
              if (token) {
                accumulated += token;
                callbacks.onToken(token);
              }
            } catch (e) {
              console.warn("[OpenRouter] Failed to parse JSON:", data);
            }
          }
        }
      });
      response.data.on("error", (err) => {
        callbacks.onError(err.message);
      });
    } catch (error) {
      const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
      console.error("[OpenRouter] API Error:", errorMessage);
      callbacks.onError(`API Request failed: ${errorMessage}`);
    }
  }
}
class FileSystemService {
  expandPath(path) {
    if (path.startsWith("~/")) {
      return join(os.homedir(), path.slice(2));
    }
    if (path === "~") {
      return os.homedir();
    }
    return path;
  }
  async listDirectories(path) {
    const fullPath = this.expandPath(path);
    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      return entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch (e) {
      console.error("Failed to list directories", e);
      return [];
    }
  }
  async listFiles(path) {
    const fullPath = this.expandPath(path);
    try {
      const files = [];
      await this.listFilesRecursive(fullPath, "", files);
      return files;
    } catch (e) {
      console.error("Failed to list files", e);
      return [];
    }
  }
  async listFilesRecursive(baseDir, relativePath, result) {
    const fullDir = join(baseDir, relativePath);
    try {
      const entries = await fs.readdir(fullDir, { withFileTypes: true });
      for (const entry of entries) {
        const rel = join(relativePath, entry.name);
        const isHidden = entry.name.startsWith(".");
        const isIgnored = ["node_modules", ".git", "build", "dist", "_build", "deps"].includes(entry.name);
        if (isHidden || isIgnored) continue;
        if (entry.isDirectory()) {
          await this.listFilesRecursive(baseDir, rel, result);
        } else {
          result.push(rel);
        }
      }
    } catch (e) {
    }
  }
}
class WorkspaceService {
  constructor() {
    this.configPath = join(os.homedir(), ".mosaic", "workspaces.json");
  }
  async ensureDir() {
    await fs.mkdir(join(os.homedir(), ".mosaic"), { recursive: true });
  }
  async getWorkspaces() {
    try {
      await this.ensureDir();
      const content = await fs.readFile(this.configPath, "utf8");
      return JSON.parse(content);
    } catch (error) {
      return [];
    }
  }
  async saveWorkspace(workspace) {
    const workspaces = await this.getWorkspaces();
    const index = workspaces.findIndex((w) => w.id === workspace.id);
    if (index !== -1) {
      workspaces[index] = workspace;
    } else {
      workspaces.push(workspace);
    }
    await this.ensureDir();
    await fs.writeFile(this.configPath, JSON.stringify(workspaces, null, 2), "utf8");
  }
  async deleteWorkspace(id) {
    const workspaces = await this.getWorkspaces();
    const filtered = workspaces.filter((w) => w.id !== id);
    await this.ensureDir();
    await fs.writeFile(this.configPath, JSON.stringify(filtered, null, 2), "utf8");
  }
}
const __dirname$1 = dirname$1(fileURLToPath(import.meta.url));
dotenv.config({ path: join$1(process.cwd(), ".env") });
dotenv.config({ path: join$1(process.cwd(), "..", ".env") });
console.log("[Main] process.cwd():", process.cwd());
console.log("[Main] __dirname:", __dirname$1);
console.log("[Main] Configuration loaded. API Key present:", !!process.env.OPENROUTER_API_KEY);
if (process.env.OPENROUTER_API_KEY) {
  console.log("[Main] API Key prefix:", process.env.OPENROUTER_API_KEY.substring(0, 10) + "...");
}
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...process.platform === "linux" ? { icon: join$1(__dirname$1, "../../build/icon.png") } : {},
    webPreferences: {
      preload: join$1(__dirname$1, "../preload/preload.mjs"),
      sandbox: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join$1(__dirname$1, "../renderer/index.html"));
  }
}
app.whenReady().then(() => {
  createWindow();
  app.on("activate", function() {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
const fileSystemService = new FileSystemService();
const workspaceService = new WorkspaceService();
const llmProvider = new OpenRouter(process.env.OPENROUTER_API_KEY || "");
console.log("[Main] Services initialized");
ipcMain.handle("ping", () => "pong");
ipcMain.handle("fs:ls", async (_event, path) => {
  return { directories: await fileSystemService.listDirectories(path) };
});
ipcMain.handle("fs:files", async (_event, path) => {
  return { files: await fileSystemService.listFiles(path) };
});
ipcMain.handle("agent:stream", async (event, { user_prompt, workspace, model_id, user_name }) => {
  console.log(`[Main] agent:stream received. Prompt: "${user_prompt.substring(0, 50)}...", Model: ${model_id}`);
  const agent = new Agent(
    llmProvider,
    model_id,
    workspace,
    user_name,
    (agentEvent) => {
      if (agentEvent.type !== "token") {
        console.log(`[Main] Agent event: ${agentEvent.type}`, agentEvent.name || agentEvent.message || "");
      }
      event.sender.send("agent:event", agentEvent);
    }
  );
  try {
    await agent.run(user_prompt);
    console.log("[Main] Agent run completed");
  } catch (error) {
    console.error("[Main] Agent run error:", error.message);
    event.sender.send("agent:event", { type: "error", message: error.message });
  }
});
ipcMain.handle("providers:get", () => {
  return {
    providers: [{
      id: "openrouter",
      name: "OpenRouter",
      models: [
        { id: "deepseek/deepseek-v3.2", name: "DeepSeek 3.2" },
        { id: "mistralai/devstral-2512", name: "Devstral 2512" }
      ]
    }]
  };
});
ipcMain.handle("workspaces:get", async () => {
  return await workspaceService.getWorkspaces();
});
ipcMain.handle("workspaces:save", async (_event, workspace) => {
  return await workspaceService.saveWorkspace(workspace);
});
ipcMain.handle("workspaces:delete", async (_event, id) => {
  return await workspaceService.deleteWorkspace(id);
});
