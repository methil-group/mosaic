"use strict";
const electron = require("electron");
const path = require("path");
const os = require("os");
const fs = require("fs");
const Database = require("better-sqlite3");
const child_process = require("child_process");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
class DbService {
  constructor(dbPath) {
    const resolvedPath = dbPath || path.join(electron.app.getPath("userData"), "mosaic.sqlite");
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    this.db = new Database(resolvedPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("synchronous = NORMAL");
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
        provider TEXT NOT NULL DEFAULT 'openrouter',
        is_visible INTEGER DEFAULT 1,
        color TEXT,
        icon TEXT,
        description TEXT,
        video TEXT,
        lottie TEXT,
        desktop_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS desktops (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT,
        path TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        model TEXT,
        events TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
      )
    `);
  }
  // Settings
  getSetting(key) {
    const row = this.db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
    return row?.value ?? null;
  }
  setSetting(key, value) {
    this.db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
  }
  // Agents
  getAgents() {
    return this.db.prepare(`
      SELECT id, name, workspace, model, provider, is_visible, color, icon, description, video, lottie, desktop_id, created_at
      FROM agents ORDER BY created_at DESC
    `).all();
  }
  getAgent(id) {
    return this.db.prepare(`
      SELECT id, name, workspace, model, provider, is_visible, color, icon, description, video, lottie, desktop_id, created_at
      FROM agents WHERE id = ?
    `).get(id);
  }
  saveAgent(agent) {
    this.db.prepare(`
      INSERT OR REPLACE INTO agents
      (id, name, workspace, model, provider, is_visible, color, icon, description, video, lottie, desktop_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM agents WHERE id = ?), CURRENT_TIMESTAMP))
    `).run(
      agent.id,
      agent.name,
      agent.workspace || "",
      agent.model || "",
      agent.provider || "openrouter",
      agent.is_visible ? 1 : 0,
      agent.color || null,
      agent.icon || null,
      agent.description || null,
      agent.video || null,
      agent.lottie || null,
      agent.desktop_id || null,
      agent.id
    );
  }
  deleteAgent(id) {
    this.db.prepare("DELETE FROM messages WHERE agent_id = ?").run(id);
    this.db.prepare("DELETE FROM agents WHERE id = ?").run(id);
  }
  updateAgentVisibility(id, isVisible) {
    this.db.prepare("UPDATE agents SET is_visible = ? WHERE id = ?").run(isVisible ? 1 : 0, id);
  }
  // Desktops
  getDesktops() {
    return this.db.prepare("SELECT id, name, color, path, created_at FROM desktops ORDER BY created_at DESC").all();
  }
  saveDesktop(desktop) {
    this.db.prepare(`
      INSERT OR REPLACE INTO desktops (id, name, color, path, created_at)
      VALUES (?, ?, ?, ?, COALESCE((SELECT created_at FROM desktops WHERE id = ?), CURRENT_TIMESTAMP))
    `).run(desktop.id, desktop.name, desktop.color || null, desktop.path || "", desktop.id);
  }
  deleteDesktop(id) {
    this.db.prepare("DELETE FROM desktops WHERE id = ?").run(id);
  }
  // Messages
  getMessages(agentId) {
    return this.db.prepare(
      "SELECT id, agent_id, role, content, model, events, created_at FROM messages WHERE agent_id = ? ORDER BY id ASC"
    ).all(agentId);
  }
  addMessage(agentId, role, content, model) {
    const result = this.db.prepare(
      "INSERT INTO messages (agent_id, role, content, model) VALUES (?, ?, ?, ?)"
    ).run(agentId, role, content, model || null);
    return { id: Number(result.lastInsertRowid) };
  }
  updateMessage(id, content, events) {
    this.db.prepare("UPDATE messages SET content = ?, events = ? WHERE id = ?").run(content, events || null, id);
  }
  clearMessagesForAgent(agentId) {
    this.db.prepare("DELETE FROM messages WHERE agent_id = ?").run(agentId);
  }
  resetDatabase() {
    this.db.exec("DROP TABLE IF EXISTS messages");
    this.db.exec("DROP TABLE IF EXISTS desktops");
    this.db.exec("DROP TABLE IF EXISTS agents");
    this.db.exec("DROP TABLE IF EXISTS settings");
    this.init();
  }
}
class OpenRouter {
  constructor(apiKey) {
    this.baseUrl = "https://openrouter.ai/api/v1";
    this.apiKey = apiKey;
  }
  async *streamChat(model, messages) {
    if (!this.apiKey) {
      yield { type: "error", message: "OpenRouter API Key not found" };
      return;
    }
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/methil-mods/mosaic",
        "X-Title": "Mosaic"
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        stream_options: { include_usage: true }
      })
    });
    if (!response.ok) {
      yield { type: "error", message: `OpenRouter HTTP ${response.status}: ${await response.text()}` };
      return;
    }
    const reader = response.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") continue;
        try {
          const json = JSON.parse(data);
          if (json.usage) {
            const u = {
              prompt_tokens: json.usage.prompt_tokens || 0,
              completion_tokens: json.usage.completion_tokens || 0,
              total_tokens: json.usage.total_tokens || 0
            };
            yield { type: "usage", usage: u };
          }
          const delta = json.choices?.[0]?.delta;
          if (delta?.content) {
            yield { type: "token", token: delta.content };
          }
        } catch {
        }
      }
    }
  }
  async fetchModels() {
    return [];
  }
}
class LMStudio {
  constructor(baseUrl) {
    this.baseUrl = baseUrl || "http://localhost:1234/v1";
  }
  async *streamChat(model, messages) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream: true })
    });
    if (!response.ok) {
      yield { type: "error", message: `LM Studio HTTP ${response.status}. Is LM Studio running on port 1234?` };
      return;
    }
    const reader = response.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") continue;
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta;
          if (delta?.content) {
            yield { type: "token", token: delta.content };
          }
        } catch {
        }
      }
    }
  }
  async fetchModels() {
    const base = this.baseUrl.replace(/\/v1$/, "");
    const models = [];
    try {
      const res = await fetch(`${base}/api/v1/models`, {
        signal: AbortSignal.timeout(3e3)
      });
      const json = await res.json();
      if (Array.isArray(json.models)) {
        for (const m of json.models) {
          if (m.type !== "llm") continue;
          if (m.key) models.push(m.key);
        }
      }
    } catch {
    }
    if (models.length === 0) {
      try {
        const res = await fetch(`${this.baseUrl}/models`, {
          signal: AbortSignal.timeout(2e3)
        });
        const json = await res.json();
        if (Array.isArray(json.data)) {
          for (const m of json.data) {
            if (m.id) models.push(m.id);
          }
        }
      } catch {
      }
    }
    return models;
  }
}
var ToolCategory = /* @__PURE__ */ ((ToolCategory2) => {
  ToolCategory2["FileSystem"] = "FileSystem";
  ToolCategory2["CodeIntelligence"] = "CodeIntelligence";
  ToolCategory2["Execution"] = "Execution";
  ToolCategory2["Communication"] = "Communication";
  ToolCategory2["General"] = "General";
  return ToolCategory2;
})(ToolCategory || {});
function resolvePath(filePath, workspace) {
  if (path__namespace.isAbsolute(filePath)) return filePath;
  return path__namespace.join(workspace, filePath);
}
function truncateResult(result, maxLen = 8e3) {
  if (result.length <= maxLen) return result;
  const half = Math.floor(maxLen / 2);
  return result.slice(0, half) + `

... [truncated ${result.length - maxLen} characters] ...

` + result.slice(-half);
}
class ReadFileTool {
  name() {
    return "read_file";
  }
  description() {
    return "Read the contents of a file. Returns the full file content with line numbers.";
  }
  category() {
    return "FileSystem";
  }
  isDestructive() {
    return false;
  }
  parameters() {
    return JSON.stringify({
      properties: {
        path: { type: "string", description: "Path to the file (relative to workspace or absolute)" }
      },
      required: ["path"]
    });
  }
  examples() {
    return [{ description: "Read a config file", xml: "<tool_call>\n  <name>read_file</name>\n  <parameters>\n    <path>src/config.ts</path>\n  </parameters>\n</tool_call>" }];
  }
  async execute(params, workspace) {
    const filePath = resolvePath(params.path || "", workspace);
    if (!fs__namespace.existsSync(filePath)) return `Error: File not found: ${filePath}`;
    const content = fs__namespace.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").map((l, i) => `${i + 1}: ${l}`).join("\n");
    return truncateResult(lines);
  }
}
class WriteFileTool {
  name() {
    return "write_file";
  }
  description() {
    return "Create or overwrite a file with the specified content. Use for NEW files only. For modifications, prefer edit_file.";
  }
  category() {
    return "FileSystem";
  }
  isDestructive() {
    return true;
  }
  parameters() {
    return JSON.stringify({
      properties: {
        path: { type: "string", description: "Path to the file" },
        content: { type: "string", description: "Full file content to write" }
      },
      required: ["path", "content"]
    });
  }
  examples() {
    return [{ description: "Create a new file", xml: "<tool_call>\n  <name>write_file</name>\n  <parameters>\n    <path>hello.txt</path>\n    <content>Hello World</content>\n  </parameters>\n</tool_call>" }];
  }
  async execute(params, workspace) {
    const filePath = resolvePath(params.path || "", workspace);
    const dir = path__namespace.dirname(filePath);
    if (!fs__namespace.existsSync(dir)) fs__namespace.mkdirSync(dir, { recursive: true });
    fs__namespace.writeFileSync(filePath, params.content || "", "utf-8");
    return `File written: ${filePath}`;
  }
}
class EditFileTool {
  name() {
    return "edit_file";
  }
  description() {
    return "Perform a surgical find-and-replace in a file. ALWAYS read the file first to get the exact content to replace.";
  }
  category() {
    return "FileSystem";
  }
  isDestructive() {
    return true;
  }
  parameters() {
    return JSON.stringify({
      properties: {
        path: { type: "string", description: "Path to the file" },
        old_content: { type: "string", description: "Exact content to find (must match exactly)" },
        new_content: { type: "string", description: "Replacement content" }
      },
      required: ["path", "old_content", "new_content"]
    });
  }
  examples() {
    return [{ description: "Replace a function name", xml: "<tool_call>\n  <name>edit_file</name>\n  <parameters>\n    <path>src/utils.ts</path>\n    <old_content>function oldName()</old_content>\n    <new_content>function newName()</new_content>\n  </parameters>\n</tool_call>" }];
  }
  async execute(params, workspace) {
    const filePath = resolvePath(params.path || "", workspace);
    if (!fs__namespace.existsSync(filePath)) return `Error: File not found: ${filePath}`;
    const content = fs__namespace.readFileSync(filePath, "utf-8");
    const oldContent = params.old_content || "";
    const newContent = params.new_content ?? "";
    const count = content.split(oldContent).length - 1;
    if (count === 0) return `Error: old_content not found in file. Read the file first to get exact content.`;
    if (count > 1) return `Error: old_content found ${count} times. Make it more specific to match exactly once.`;
    fs__namespace.writeFileSync(filePath, content.replace(oldContent, newContent), "utf-8");
    return `File edited successfully: ${filePath}`;
  }
}
class RunCommandTool {
  name() {
    return "run_command";
  }
  description() {
    return "Execute a shell command in the workspace directory. Use for builds, tests, git, etc.";
  }
  category() {
    return "Execution";
  }
  isDestructive() {
    return true;
  }
  parameters() {
    return JSON.stringify({
      properties: {
        command: { type: "string", description: "Shell command to execute" },
        timeout: { type: "string", description: "Timeout in seconds (default: 30)" }
      },
      required: ["command"]
    });
  }
  examples() {
    return [{ description: "Run tests", xml: "<tool_call>\n  <name>run_command</name>\n  <parameters>\n    <command>npm test</command>\n  </parameters>\n</tool_call>" }];
  }
  async execute(params, workspace) {
    const timeout = parseInt(params.timeout || "30") * 1e3;
    try {
      const output = child_process.execSync(params.command || 'echo "no command"', {
        cwd: workspace,
        timeout,
        encoding: "utf-8",
        maxBuffer: 1024 * 1024,
        stdio: ["pipe", "pipe", "pipe"]
      });
      return truncateResult(`Exit code: 0

${output}`);
    } catch (err) {
      const stdout = err.stdout || "";
      const stderr = err.stderr || "";
      const code = err.status ?? 1;
      return truncateResult(`Exit code: ${code}

STDOUT:
${stdout}

STDERR:
${stderr}`);
    }
  }
}
class SearchFilesTool {
  name() {
    return "search_files";
  }
  description() {
    return "Search for a pattern in all files recursively. Returns matching lines with file paths and line numbers.";
  }
  category() {
    return "CodeIntelligence";
  }
  isDestructive() {
    return false;
  }
  parameters() {
    return JSON.stringify({
      properties: {
        pattern: { type: "string", description: "Text or regex pattern to search for" },
        path: { type: "string", description: "Directory to search in (default: workspace root)" },
        file_pattern: { type: "string", description: 'Glob pattern to filter files, e.g. "*.ts"' }
      },
      required: ["pattern"]
    });
  }
  examples() {
    return [{ description: "Find all TODO comments", xml: "<tool_call>\n  <name>search_files</name>\n  <parameters>\n    <pattern>TODO</pattern>\n  </parameters>\n</tool_call>" }];
  }
  async execute(params, workspace) {
    const searchPath = resolvePath(params.path || ".", workspace);
    const pattern = params.pattern || "";
    const excludeDirs = ["node_modules", ".git", "target", "dist", ".nuxt", ".output", "__pycache__"];
    const results = [];
    function searchDir(dir) {
      if (results.length > 100) return;
      let entries;
      try {
        entries = fs__namespace.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (results.length > 100) break;
        if (excludeDirs.includes(entry.name)) continue;
        const full = path__namespace.join(dir, entry.name);
        if (entry.isDirectory()) {
          searchDir(full);
        } else if (entry.isFile()) {
          if (params.file_pattern && !entry.name.match(globToRegex(params.file_pattern))) continue;
          try {
            const content = fs__namespace.readFileSync(full, "utf-8");
            const lines = content.split("\n");
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].includes(pattern)) {
                const rel = path__namespace.relative(workspace, full);
                results.push(`${rel}:${i + 1}: ${lines[i].trim()}`);
              }
            }
          } catch {
          }
        }
      }
    }
    searchDir(searchPath);
    if (results.length === 0) return `No matches found for "${pattern}"`;
    return truncateResult(results.join("\n"));
  }
}
function globToRegex(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`);
}
class ListDirectoryTool {
  name() {
    return "list_directory";
  }
  description() {
    return "List files and directories in a path. Shows file sizes and types.";
  }
  category() {
    return "FileSystem";
  }
  isDestructive() {
    return false;
  }
  parameters() {
    return JSON.stringify({
      properties: {
        path: { type: "string", description: "Directory path (default: workspace root)" },
        recursive: { type: "string", description: 'If "true", list recursively (max 3 levels)' }
      },
      required: []
    });
  }
  examples() {
    return [{ description: "List project root", xml: "<tool_call>\n  <name>list_directory</name>\n  <parameters>\n    <path>.</path>\n  </parameters>\n</tool_call>" }];
  }
  async execute(params, workspace) {
    const dirPath = resolvePath(params.path || ".", workspace);
    const recursive = params.recursive === "true";
    const excludeDirs = ["node_modules", ".git", "target", "dist", ".nuxt", ".output"];
    const lines = [];
    function listDir(dir, prefix, depth) {
      if (lines.length > 200) return;
      let entries;
      try {
        entries = fs__namespace.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      entries.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });
      for (const entry of entries) {
        if (excludeDirs.includes(entry.name)) continue;
        const full = path__namespace.join(dir, entry.name);
        if (entry.isDirectory()) {
          lines.push(`${prefix}📁 ${entry.name}/`);
          if (recursive && depth < 3) listDir(full, prefix + "  ", depth + 1);
        } else {
          try {
            const stat = fs__namespace.statSync(full);
            const size = formatSize(stat.size);
            lines.push(`${prefix}📄 ${entry.name} (${size})`);
          } catch {
            lines.push(`${prefix}📄 ${entry.name}`);
          }
        }
      }
    }
    listDir(dirPath, "", 0);
    if (lines.length === 0) return `Directory is empty or does not exist: ${dirPath}`;
    return lines.join("\n");
  }
}
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
class ManageTodosTool {
  name() {
    return "manage_todos";
  }
  description() {
    return "Track your progress with a checklist. Create and update task lists visible to the user.";
  }
  category() {
    return "General";
  }
  isDestructive() {
    return false;
  }
  parameters() {
    return JSON.stringify({
      properties: {
        checklist: { type: "string", description: 'Full checklist in markdown format, e.g. "- [x] Done\\n- [ ] Pending"' }
      },
      required: ["checklist"]
    });
  }
  examples() {
    return [];
  }
  async execute(params) {
    return `Checklist updated:
${params.checklist || "(empty)"}`;
  }
}
class ToolRegistry {
  constructor(tools2) {
    this.tools = tools2;
  }
  getTools() {
    return this.tools;
  }
  find(name) {
    return this.tools.find((t) => t.name() === name);
  }
}
function getDefaultTools() {
  return new ToolRegistry([
    new ReadFileTool(),
    new WriteFileTool(),
    new EditFileTool(),
    new RunCommandTool(),
    new SearchFilesTool(),
    new ListDirectoryTool(),
    new ManageTodosTool()
  ]);
}
class IdentityPart {
  constructor(userName) {
    this.userName = userName;
  }
  render() {
    return `You are MOSAIC, a highly capable AI coding agent. You operate inside a workspace and have direct access to tools for reading, writing, editing files, running commands, and searching code.
Your user is ${this.userName}. Be concise, precise, and action-oriented.`;
  }
}
class CodingWorkflowPart {
  render() {
    return `## CODING WORKFLOW

Follow this sequence for every coding task:

1. **UNDERSTAND** — Read relevant files, search for patterns, list directory structure.
   Never modify code you haven't read first.
2. **PLAN** — Use manage_todos to outline your approach before writing any code.
3. **IMPLEMENT** — Use \`edit_file\` for modifications (preferred), \`write_file\` only for new files.
4. **VERIFY** — Run builds/tests with \`run_command\` to confirm your changes work.
5. **REPORT** — Summarize what you did, what changed, and any remaining issues.

NEVER skip step 1. NEVER write code without reading the existing file first.
ALWAYS verify your changes compile/run before reporting success.`;
  }
}
class ToolFormatPart {
  constructor(tools2) {
    this.tools = tools2;
  }
  render() {
    const categories = [
      [ToolCategory.FileSystem, "FILE SYSTEM"],
      [ToolCategory.CodeIntelligence, "CODE INTELLIGENCE"],
      [ToolCategory.Execution, "EXECUTION"],
      [ToolCategory.Communication, "COMMUNICATION"],
      [ToolCategory.General, "GENERAL"]
    ];
    let toolSections = "";
    for (const [cat, catName] of categories) {
      const catTools = this.tools.filter((t) => t.category() === cat);
      if (catTools.length === 0) continue;
      toolSections += `
### ${catName}

`;
      for (const tool of catTools) {
        const badge = tool.isDestructive() ? " ⚠️ DESTRUCTIVE" : "";
        toolSections += `**${tool.name()}**${badge}
`;
        toolSections += `${tool.description()}
`;
        try {
          const params = JSON.parse(tool.parameters());
          const props = params.properties || {};
          const required = params.required || [];
          if (Object.keys(props).length > 0) {
            toolSections += "Parameters:\n";
            for (const [name, schema] of Object.entries(props)) {
              const req = required.includes(name) ? " (required)" : " (optional)";
              const desc = schema.description || "";
              toolSections += `  - \`${name}\`${req}: ${desc}
`;
            }
          }
        } catch {
        }
        const examples = tool.examples();
        for (const ex of examples) {
          toolSections += `Example — ${ex.description}:
${ex.xml}
`;
        }
        toolSections += "\n";
      }
    }
    return `## AVAILABLE TOOLS
${toolSections}
## TOOL CALLING FORMAT

To call a tool, use this XML format. All parameter values MUST be strings:
<tool_call>
  <name>tool_name</name>
  <parameters>
    <param_name>value</param_name>
  </parameters>
</tool_call>

You can call ONE tool at a time. After each call, the system provides the result in a <tool_result> block.
Wait for the result before proceeding to the next step.`;
  }
}
class ChecklistBehaviorPart {
  render() {
    return `## PROGRESS TRACKING

For complex tasks, maintain a checklist using the \`manage_todos\` tool:
- \`[ ]\` pending  \`[>]\` in-progress  \`[x]\` completed
- Format: \`[status] Task Name <- context\`

Update the checklist as you make progress. The user sees it in real-time.`;
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
  static createSystemPrompt(tools2, _workspace, userName, persona) {
    const parts = [];
    if (persona) {
      parts.push(new PersonaPart(persona));
    }
    parts.push(new IdentityPart(userName));
    parts.push(new CodingWorkflowPart());
    parts.push(new ToolFormatPart(tools2));
    parts.push(new ChecklistBehaviorPart());
    return parts.map((p) => p.render()).join("\n\n") + `

## CRITICAL RULES

1. **ACT, don't narrate.** Never say "I will..." or "Let me..." — just call the tool.
2. **Read before writing.** Always read a file before editing it.
3. **Verify your work.** Run tests or builds after making changes.
4. **Be surgical.** Use \`edit_file\` instead of \`write_file\` for existing files.
5. **One tool per turn.** Call exactly one tool, then wait for the result.`;
  }
  static formatToolResult(name, result) {
    return `<tool_result name="${name}">
${result}
</tool_result>`;
  }
}
class Agent {
  constructor(llm, model, workspace, userName, tools2) {
    this.messages = [];
    this.stopped = false;
    this.llm = llm;
    this.model = model;
    this.workspace = workspace;
    this.userName = userName;
    this.tools = tools2;
  }
  stop() {
    this.stopped = true;
  }
  async run(userPrompt, history, persona, onEvent) {
    const systemPrompt = PromptBuilder.createSystemPrompt(
      this.tools.getTools(),
      this.workspace,
      this.userName,
      persona
    );
    this.messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: userPrompt }
    ];
    await this.reasoningLoop(onEvent);
  }
  async reasoningLoop(onEvent) {
    let totalSteps = 0;
    while (true) {
      if (this.stopped) break;
      totalSteps++;
      if (totalSteps > 100) {
        onEvent({ type: "error", message: "Max steps reached" });
        break;
      }
      let fullText = "";
      try {
        for await (const event of this.llm.streamChat(this.model, [...this.messages])) {
          if (this.stopped) break;
          switch (event.type) {
            case "token":
              fullText += event.token;
              onEvent({ type: "token", data: event.token });
              break;
            case "usage":
              onEvent({ type: "usage", data: JSON.stringify(event.usage) });
              break;
            case "error":
              onEvent({ type: "error", message: event.message });
              return;
          }
        }
      } catch (err) {
        onEvent({ type: "error", message: err.message || String(err) });
        return;
      }
      const toolCall = this.parseToolCall(fullText);
      if (toolCall) {
        const [name, params] = toolCall;
        onEvent({ type: "tool_started", name, parameters: JSON.stringify(params) });
        const tool = this.tools.find(name);
        let result;
        if (tool) {
          try {
            result = await tool.execute(params, this.workspace);
          } catch (err) {
            result = `Error: ${err.message || err}`;
          }
        } else {
          result = `Error: Tool '${name}' not found`;
        }
        onEvent({ type: "tool_finished", name, result });
        this.messages.push({ role: "assistant", content: fullText });
        this.messages.push({ role: "user", content: PromptBuilder.formatToolResult(name, result) });
      } else {
        onEvent({ type: "final_answer", data: fullText });
        break;
      }
    }
  }
  parseToolCall(content) {
    const tcStart = content.indexOf("<tool_call>");
    if (tcStart === -1) return null;
    const tcEnd = content.indexOf("</tool_call>");
    if (tcEnd === -1) return null;
    const inner = content.slice(tcStart + 11, tcEnd);
    const nStart = inner.indexOf("<name>");
    const nEnd = inner.indexOf("</name>");
    if (nStart === -1 || nEnd === -1) return null;
    const name = inner.slice(nStart + 6, nEnd).trim();
    const params = {};
    const pStart = inner.indexOf("<parameters>");
    const pEnd = inner.indexOf("</parameters>");
    if (pStart !== -1 && pEnd !== -1) {
      const pInner = inner.slice(pStart + 12, pEnd);
      let cursor = pInner;
      while (true) {
        const tagStart = cursor.indexOf("<");
        if (tagStart === -1) break;
        const tagEnd = cursor.indexOf(">", tagStart);
        if (tagEnd === -1) break;
        const tagName = cursor.slice(tagStart + 1, tagEnd);
        if (tagName.startsWith("/")) {
          cursor = cursor.slice(tagEnd + 1);
          continue;
        }
        const closeTag = `</${tagName}>`;
        const valEnd = cursor.indexOf(closeTag, tagEnd + 1);
        if (valEnd === -1) break;
        const val = cursor.slice(tagEnd + 1, valEnd);
        params[tagName] = val.trim();
        cursor = cursor.slice(valEnd + closeTag.length);
      }
    }
    return [name, params];
  }
}
let db;
let tools;
let lmStudio;
let mainWindow = null;
const activeAgents = /* @__PURE__ */ new Map();
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: "Mosaic",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:3710");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../.output/public/index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
function registerIpc() {
  electron.ipcMain.handle("ping", () => "pong");
  electron.ipcMain.handle("get_agents", () => db.getAgents());
  electron.ipcMain.handle("agents_save", (_e, { agent }) => {
    db.saveAgent(agent);
  });
  electron.ipcMain.handle("agents_delete", (_e, { id }) => {
    db.deleteAgent(id);
  });
  electron.ipcMain.handle("agents_update_visibility", (_e, { id, isVisible }) => {
    db.updateAgentVisibility(id, isVisible);
  });
  electron.ipcMain.handle("messages_list", (_e, { agentId }) => db.getMessages(agentId));
  electron.ipcMain.handle("messages_add", (_e, { agentId, role, content, model }) => {
    return db.addMessage(agentId, role, content, model);
  });
  electron.ipcMain.handle("messages_update", (_e, { id, content, events }) => {
    db.updateMessage(id, content, events);
  });
  electron.ipcMain.handle("messages_clear_for_agent", (_e, { instanceId }) => {
    db.clearMessagesForAgent(instanceId);
  });
  electron.ipcMain.handle("desktops_list", () => db.getDesktops());
  electron.ipcMain.handle("desktops_save", (_e, { desktop }) => {
    db.saveDesktop(desktop);
  });
  electron.ipcMain.handle("desktops_delete", (_e, { id }) => {
    db.deleteDesktop(id);
  });
  electron.ipcMain.handle("settings_get", (_e, { key }) => db.getSetting(key));
  electron.ipcMain.handle("settings_set", (_e, { key, value }) => {
    db.setSetting(key, value);
  });
  electron.ipcMain.handle("providers_get", async () => {
    const lmStudioModels = await lmStudio.fetchModels().catch(() => []);
    return {
      providers: [
        {
          id: "openrouter",
          name: "OpenRouter",
          models: [
            { id: "qwen/qwen3.5-397b-a17b", name: "Qwen 3.5 397B" },
            { id: "qwen/qwen3-coder-next", name: "Qwen 3 Coder" },
            { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet" }
          ]
        },
        {
          id: "lmstudio",
          name: "LM Studio (Local)",
          models: lmStudioModels.map((m) => ({ id: m, name: m }))
        }
      ]
    };
  });
  electron.ipcMain.handle("list_directories", (_e, { path: dirPath, show_hidden }) => {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      const dirs = entries.filter((e) => e.isDirectory()).filter((e) => show_hidden || !e.name.startsWith(".")).map((e) => e.name);
      return { directories: dirs };
    } catch {
      return { directories: [] };
    }
  });
  electron.ipcMain.handle("fetch_files", (_e, { path: dirPath, show_hidden }) => {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      const files = entries.filter((e) => e.isFile()).filter((e) => show_hidden || !e.name.startsWith(".")).map((e) => e.name);
      return { files };
    } catch {
      return { files: [] };
    }
  });
  electron.ipcMain.handle("get_system_paths", () => ({
    home: os.homedir(),
    desktop: path.join(os.homedir(), "Desktop"),
    documents: path.join(os.homedir(), "Documents"),
    downloads: path.join(os.homedir(), "Downloads"),
    sep: path.sep
  }));
  electron.ipcMain.handle("create_directory", (_e, { path: dirPath, name }) => {
    const full = path.join(dirPath, name);
    if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
  });
  electron.ipcMain.handle("app_reset_data", () => {
    db.resetDatabase();
  });
  electron.ipcMain.handle("agent_stream", async (_e, { instanceId, modelId, userPrompt, workspace, userName, history, persona }) => {
    const dbAgent = db.getAgent(instanceId);
    const providerId = dbAgent?.provider || (modelId.includes("/") ? "openrouter" : "lmstudio");
    const apiKey = db.getSetting("openrouter_api_key") || "";
    const currentOpenRouter = new OpenRouter(apiKey);
    const provider = providerId === "lmstudio" ? lmStudio : currentOpenRouter;
    const agent = new Agent(provider, modelId, workspace, userName, tools);
    activeAgents.set(instanceId, agent);
    try {
      await agent.run(
        userPrompt,
        history,
        persona,
        (event) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("agent-event", {
              instanceId,
              event
            });
          }
        }
      );
    } finally {
      activeAgents.delete(instanceId);
    }
  });
  electron.ipcMain.handle("stop_agent", (_e, { instanceId }) => {
    const agent = activeAgents.get(instanceId);
    if (agent) {
      agent.stop();
      activeAgents.delete(instanceId);
      return true;
    }
    return false;
  });
}
electron.app.whenReady().then(() => {
  db = new DbService();
  tools = getDefaultTools();
  new OpenRouter(db.getSetting("openrouter_api_key") || "");
  lmStudio = new LMStudio();
  registerIpc();
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
});
