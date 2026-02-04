import { app, BrowserWindow, ipcMain } from "electron";
import path, { dirname as dirname$1, join as join$1 } from "path";
import { fileURLToPath } from "url";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { join, dirname } from "node:path";
import * as os from "node:os";
import * as fs from "node:fs/promises";
import axios from "axios";
import * as dotenv from "dotenv";
import Database from "better-sqlite3";
import fs$1 from "fs";
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
class Tool {
  expandPath(path2) {
    if (!path2 || typeof path2 !== "string") return "";
    if (path2.startsWith("~/")) {
      return join(os.homedir(), path2.slice(2));
    }
    if (path2 === "~") {
      return os.homedir();
    }
    return path2;
  }
}
const execPromise = promisify(exec);
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
    const expandedPath = this.expandPath(params.path);
    const expandedWorkspace = this.expandPath(workspace);
    const absolutePath = expandedPath.startsWith("/") || expandedPath.includes(":") ? expandedPath : join(expandedWorkspace, expandedPath);
    try {
      return await fs.readFile(absolutePath, "utf8");
    } catch (error) {
      return `Error reading file: ${error.message} (Attempted path: ${absolutePath})`;
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
    this.description = "Manage a list of todo items. Use this to track progress on multi-step tasks.";
    this.parameters = JSON.stringify({
      type: "object",
      properties: {
        checklist: {
          type: "string",
          description: "The full list of tasks in the format: [x] completed, [>] in progress, [ ] pending. Use <- to add context, e.g., [>] Task Name <- details"
        }
      },
      required: ["checklist"]
    });
  }
  async execute(params, _workspace) {
    if (!params.checklist || params.checklist.trim() === "") {
      throw new Error("Checklist cannot be empty. Please provide the full updated checklist.");
    }
    return params.checklist;
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
To call a tool, use the following XML-like format. All parameter values MUST be strings:
<tool_call>
  <name>tool_name</name>
  <parameters>
    <your_parameter_name>the_actual_value</your_parameter_name>
  </parameters>
</tool_call>

EXAMPLE:
<tool_call>
  <name>read_file</name>
  <parameters>
    <path>README.md</path>
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
3. Use the following format for each item in the 'checklist' parameter:
   - [ ] for pending tasks
   - [>] for in-progress tasks
   - [x] for completed tasks
   - Follow with 'Task Name <- context/details'
EXAMPLE CALL:
<tool_call>
  <name>manage_todos</name>
  <parameters>
    <checklist>
[x] Initialization <- Done
[>] Researching files <- Currently reading routes
[ ] Final report <- Pending
    </checklist>
</tool_call>
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
class PersonaPart {
  constructor(persona) {
    this.persona = persona;
  }
  render() {
    return `## YOUR PERSONA

${this.persona}`;
  }
}
class PromptBuilder {
  static createSystemPrompt(tools, workspace, userName, persona) {
    const parts = [
      new IdentityPart(userName),
      new WorkspaceContextPart(workspace),
      new ToolFormatPart(tools),
      new ChecklistBehaviorPart()
    ];
    if (persona) {
      parts.unshift(new PersonaPart(persona));
    }
    return parts.map((p) => p.render()).join("\n\n") + `

## CRITICAL RULES

1. **You MUST either call a tool OR provide a final answer. Never say what you're "going to do" - just DO IT.**
2. If you need more information, call the appropriate tool immediately.
3. Only provide a final answer when you have completed the task and gathered all necessary information.
4. Never respond with "Now let me..." or "I will..." - if you need to do something, call the tool.`;
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
  async run(userPrompt, history = [], persona) {
    const systemPrompt = PromptBuilder.createSystemPrompt(this.tools, this.workspace, this.userName, persona);
    this.messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: userPrompt }
    ];
    await this.reasoningLoop();
    console.log("[Agent] Run finished");
  }
  async reasoningLoop() {
    console.log("[Agent v2] Starting reasoning loop");
    let loop = true;
    let toolRetryCount = 0;
    let totalSteps = 0;
    const maxSteps = 100;
    const maxToolRetries = 3;
    const accumulatedAssistantContent = [];
    let lastToolCallFingerprint = "";
    try {
      while (loop) {
        totalSteps++;
        if (totalSteps > maxSteps) {
          console.error("[Agent v2] Max steps reached, stopping.");
          this.onEvent({ type: "error", message: "Maximum reasoning steps exceeded." });
          break;
        }
        const stepResult = await this.runStep();
        const contentWithoutTool = stepResult.content.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, "").trim();
        if (contentWithoutTool) {
          accumulatedAssistantContent.push(contentWithoutTool);
        }
        if (stepResult.toolCall) {
          const { name, parameters } = stepResult.toolCall;
          const currentFingerprint = `${name}:${JSON.stringify(parameters)}`;
          console.log(`[Agent v2] Step ${totalSteps} | Tool call: ${name}`, parameters);
          if (currentFingerprint === lastToolCallFingerprint) {
            console.warn(`[Agent v2] Detected repetitive tool call: ${name}`);
            this.messages.push({
              role: "user",
              content: `You just called '${name}' with the exact same parameters. If it didn't give you what you wanted, try a different approach or tool. Do not repeat the same call.`
            });
            lastToolCallFingerprint = currentFingerprint;
            continue;
          }
          lastToolCallFingerprint = currentFingerprint;
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
              console.log(`[Agent v2] Tool finished: ${name}. Result length: ${result.length}`);
              toolRetryCount = 0;
            } catch (error) {
              console.error(`[Agent v2] Tool execution error: ${name}`, error.message);
              toolRetryCount++;
              if (toolRetryCount >= maxToolRetries) {
                this.onEvent({ type: "error", message: `Too many tool failures. Last error: ${error.message}` });
                loop = false;
              } else {
                this.onEvent({ type: "error", message: `Tool error: ${error.message}. Retrying...` });
                this.messages.push({
                  role: "user",
                  content: `Tool '${name}' failed with error: ${error.message}. Please check your parameters and try again or use a different approach.`
                });
              }
            }
          } else {
            console.error(`[Agent v2] Tool not found: ${name}`);
            this.messages.push({ role: "user", content: `Tool '${name}' not found. Please use one of the available tools.` });
            toolRetryCount++;
            if (toolRetryCount >= maxToolRetries) loop = false;
          }
        } else {
          const intentPhrases = [
            /now (i'll|i will|let me|i'm going to)/i,
            /let me (check|read|look|examine|explore|see)/i,
            /i (will|shall|am going to|need to) (check|read|look|examine|explore)/i
          ];
          const isIntentStatement = intentPhrases.some((pattern) => pattern.test(contentWithoutTool));
          if (isIntentStatement) {
            console.log("[Agent v2] Detected intent statement without tool call, nudging...");
            this.messages.push({ role: "assistant", content: contentWithoutTool });
            this.messages.push({
              role: "user",
              content: "You said you would do something but didn't call a tool. Please call the appropriate tool now to complete the action you described."
            });
          } else if (!contentWithoutTool || contentWithoutTool.length < 5) {
            if (accumulatedAssistantContent.length > 0) {
              const finalFullContent = Array.from(new Set(accumulatedAssistantContent)).join("\n\n");
              if (finalFullContent.length < 50 && totalSteps > 2) {
                console.log("[Agent v2] Accumulated content too short, nudging for a real summary...");
                this.messages.push({
                  role: "user",
                  content: "You have finished your exploration. Please provide a clear and comprehensive summary of what you found for the user."
                });
                continue;
              }
              console.log("[Agent v2] Finishing with accumulated content.");
              this.onEvent({ type: "final_answer", data: finalFullContent });
              loop = false;
            } else {
              console.log("[Agent v2] Empty or too short response, nudging for answer...");
              this.messages.push({
                role: "user",
                content: "Please provide a complete answer based on what you have learned, or call another tool."
              });
            }
          } else {
            console.log("[Agent v2] Final answer received");
            const finalFullContent = Array.from(new Set(accumulatedAssistantContent.concat([contentWithoutTool]))).join("\n\n");
            this.onEvent({ type: "final_answer", data: finalFullContent });
            loop = false;
          }
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
      let emittedLength = 0;
      this.llm.streamChat(this.model, this.messages, {
        onToken: (token) => {
          accumulated += token;
          const toolCallStart = accumulated.indexOf("<tool_call>");
          if (toolCallStart === -1) {
            let safeEnd = accumulated.length;
            const potentialStarts = ["<", "<t", "<to", "<too", "<tool", "<tool_", "<tool_c", "<tool_ca", "<tool_cal", "<tool_call"];
            for (const prefix of potentialStarts) {
              if (accumulated.endsWith(prefix)) {
                safeEnd = accumulated.length - prefix.length;
                break;
              }
            }
            if (safeEnd > emittedLength) {
              const toEmit = accumulated.substring(emittedLength, safeEnd);
              this.onEvent({ type: "token", data: toEmit });
              emittedLength = safeEnd;
            }
          } else if (toolCallStart > emittedLength) {
            const toEmit = accumulated.substring(emittedLength, toolCallStart);
            if (toEmit) {
              this.onEvent({ type: "token", data: toEmit });
            }
            emittedLength = accumulated.length;
          } else {
            emittedLength = accumulated.length;
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
      const paramMatches = paramsXml.matchAll(/<(.*?)>([\s\S]*?)<\/\1>/g);
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
  updateApiKey(newKey) {
    this.apiKey = newKey;
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
      console.error("[OpenRouter] API Error:", error.message);
      let errorMessage = error.message;
      if (error.response && error.response.data) {
        try {
          errorMessage = typeof error.response.data === "string" ? error.response.data : JSON.stringify(error.response.data);
        } catch (e) {
          errorMessage = "Error parsing API response";
        }
      }
      callbacks.onError(`API Request failed: ${errorMessage}`);
    }
  }
}
class FileSystemService {
  expandPath(path2) {
    if (path2.startsWith("~/")) {
      return join(os.homedir(), path2.slice(2));
    }
    if (path2 === "~") {
      return os.homedir();
    }
    return path2;
  }
  async listDirectories(path2) {
    const fullPath = this.expandPath(path2);
    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      return entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch (e) {
      console.error("Failed to list directories", e);
      return [];
    }
  }
  async listFiles(path2) {
    const fullPath = this.expandPath(path2);
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
class DatabaseService {
  constructor() {
    const userDataPath = app.getPath("userData");
    const dbPath = path.join(userDataPath, "mosaic.sqlite");
    if (!fs$1.existsSync(userDataPath)) {
      fs$1.mkdirSync(userDataPath, { recursive: true });
    }
    this.db = new Database(dbPath);
    this.init();
  }
  init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        workspace TEXT DEFAULT '',
        model TEXT NOT NULL,
        is_visible INTEGER DEFAULT 1,
        color TEXT,
        icon TEXT,
        description TEXT,
        video TEXT,
        lottie TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    try {
      const tableInfo = this.db.prepare("PRAGMA table_info(agents)").all();
      const columns = tableInfo.map((c) => c.name);
      if (!columns.includes("color")) {
        this.db.prepare("ALTER TABLE agents ADD COLUMN color TEXT").run();
      }
      if (!columns.includes("icon")) {
        this.db.prepare("ALTER TABLE agents ADD COLUMN icon TEXT").run();
      }
      if (!columns.includes("description")) {
        this.db.prepare("ALTER TABLE agents ADD COLUMN description TEXT").run();
      }
      if (!columns.includes("video")) {
        this.db.prepare("ALTER TABLE agents ADD COLUMN video TEXT").run();
      }
      if (!columns.includes("lottie")) {
        this.db.prepare("ALTER TABLE agents ADD COLUMN lottie TEXT").run();
      }
    } catch (error) {
      console.error("Failed to migrate agents table:", error);
    }
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        model TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
      )
    `);
  }
  // Settings methods
  getSetting(key) {
    const row = this.db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
    return row ? row.value : null;
  }
  setSetting(key, value) {
    this.db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
  }
  deleteSetting(key) {
    this.db.prepare("DELETE FROM settings WHERE key = ?").run(key);
  }
  // Agent methods
  getAgents() {
    return this.db.prepare("SELECT * FROM agents ORDER BY created_at DESC").all();
  }
  getAgent(id) {
    const row = this.db.prepare("SELECT * FROM agents WHERE id = ?").get(id);
    return row || null;
  }
  saveAgent(agent) {
    const isVisible = agent.is_visible !== void 0 ? agent.is_visible ? 1 : 0 : 1;
    this.db.prepare(`
      INSERT OR REPLACE INTO agents (id, name, workspace, model, is_visible, color, icon, description, video, lottie, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM agents WHERE id = ?), CURRENT_TIMESTAMP))
    `).run(agent.id, agent.name, agent.workspace, agent.model, isVisible, agent.color || null, agent.icon || null, agent.description || null, agent.video || null, agent.lottie || null, agent.id);
  }
  updateAgentVisibility(id, isVisible) {
    this.db.prepare("UPDATE agents SET is_visible = ? WHERE id = ?").run(isVisible ? 1 : 0, id);
  }
  deleteAgent(id) {
    this.db.prepare("DELETE FROM agents WHERE id = ?").run(id);
  }
  // Message methods
  getMessages(agentId) {
    return this.db.prepare("SELECT * FROM messages WHERE agent_id = ? ORDER BY created_at ASC").all(agentId);
  }
  addMessage(agentId, role, content, model) {
    const result = this.db.prepare("INSERT INTO messages (agent_id, role, content, model) VALUES (?, ?, ?, ?)").run(agentId, role, content, model || null);
    return result.lastInsertRowid;
  }
  updateMessage(id, content) {
    this.db.prepare("UPDATE messages SET content = ? WHERE id = ?").run(content, id);
  }
  deleteMessagesForAgent(agentId) {
    this.db.prepare("DELETE FROM messages WHERE agent_id = ?").run(agentId);
  }
  close() {
    this.db.close();
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
const databaseService = new DatabaseService();
const fileSystemService = new FileSystemService();
const workspaceService = new WorkspaceService();
const storedApiKey = databaseService.getSetting("openrouter_api_key");
const llmProvider = new OpenRouter(storedApiKey || "");
console.log("[Main] Services initialized");
console.log("[Main] API Key from DB present:", !!storedApiKey);
ipcMain.handle("ping", () => "pong");
ipcMain.handle("fs:ls", async (_event, path2) => {
  return { directories: await fileSystemService.listDirectories(path2) };
});
ipcMain.handle("fs:files", async (_event, path2) => {
  return { files: await fileSystemService.listFiles(path2) };
});
ipcMain.handle("agent:stream", async (event, { user_prompt, workspace, model_id, user_name, history, persona }) => {
  console.log(`[Main] agent:stream received. Prompt: "${user_prompt.substring(0, 50)}...", Model: ${model_id}, Persona present: ${!!persona}`);
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
    await agent.run(user_prompt, history || [], persona);
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
        { id: "qwen/qwen3-coder-next", name: "Qwen 3 Coder Next" },
        { id: "qwen/qwen3-vl-8b-thinking", name: "Qwen 3 VL 8B Thinking" },
        { id: "deepseek/deepseek-v3.2", name: "DeepSeek 3.2" },
        { id: "mistralai/devstral-2512", name: "Devstral 2512" },
        { id: "stepfun/step-3.5-flash:free", name: "Step 3.5 Flash" }
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
ipcMain.handle("settings:get", (_event, key) => {
  return databaseService.getSetting(key);
});
ipcMain.handle("settings:set", (_event, { key, value }) => {
  databaseService.setSetting(key, value);
  if (key === "openrouter_api_key") {
    llmProvider.updateApiKey(value);
    console.log("[Main] OpenRouter API Key updated in provider");
  }
  return { success: true };
});
ipcMain.handle("agents:list", () => {
  return databaseService.getAgents();
});
ipcMain.handle("agents:get", (_event, id) => {
  return databaseService.getAgent(id);
});
ipcMain.handle("agents:save", (_event, agent) => {
  databaseService.saveAgent(agent);
  return { success: true };
});
ipcMain.handle("agents:updateVisibility", (_event, { id, isVisible }) => {
  databaseService.updateAgentVisibility(id, isVisible);
  return { success: true };
});
ipcMain.handle("agents:delete", (_event, id) => {
  databaseService.deleteAgent(id);
  return { success: true };
});
ipcMain.handle("messages:list", (_event, agentId) => {
  return databaseService.getMessages(agentId);
});
ipcMain.handle("messages:add", (_event, { agentId, role, content, model }) => {
  const id = databaseService.addMessage(agentId, role, content, model);
  return { id };
});
ipcMain.handle("messages:update", (_event, { id, content }) => {
  databaseService.updateMessage(id, content);
  return { success: true };
});
ipcMain.handle("messages:clearForAgent", (_event, agentId) => {
  databaseService.deleteMessagesForAgent(agentId);
  return { success: true };
});
