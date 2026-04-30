import * as fs from 'fs';
import * as path from 'path';

export type MessageContentType = 'message' | 'thought' | 'tool_call' | 'user_tool_result';

export interface MessageContentPart {
  type: MessageContentType;
  content: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | MessageContentPart[];
  metadata?: any;
  id?: string;
}

export interface ChatSession {
  session_id: string;
  title?: string;
  last_updated: string;
  history: ChatMessage[];
  totalCost?: number;
}

export class SessionManager {
  private sessionId: string;
  private chatDir: string;
  private logDir: string;
  private sessionLogDir = '';
  private promptCount = 0;
  private title = "New Chat";
  private history: ChatMessage[] = [];
  private totalCost = 0;
  constructor(workspacePath: string, sessionId?: string) {
    if (sessionId) {
      this.sessionId = sessionId;
    } else {
      const timestamp = this.getTimestampForId();
      this.sessionId = `${timestamp}_${Math.floor(Math.random() * 1000000)}`;
    }
    
    if (workspacePath) {
      const mosaicDir = path.join(workspacePath, '.mosaic');
      this.chatDir = path.join(mosaicDir, 'chats');
      this.logDir = path.join(mosaicDir, 'logs');
      this.sessionLogDir = path.join(this.logDir, this.sessionId);

      if (!fs.existsSync(this.chatDir)) {
        fs.mkdirSync(this.chatDir, { recursive: true });
      }
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
      if (!fs.existsSync(this.sessionLogDir)) {
        fs.mkdirSync(this.sessionLogDir, { recursive: true });
      }
    } else {
      this.chatDir = '';
      this.logDir = '';
      this.sessionLogDir = '';
    }
  }

  public setTitle(title: string) {
    this.title = title;
    if (this.chatDir) this.saveSession();
  }

  public log(role: string, message: string) {
    if (!this.sessionLogDir) return;
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${role.toUpperCase()}] ${message}\n`;
    const logFile = path.join(this.sessionLogDir, 'session.log');
    fs.appendFileSync(logFile, logLine);
  }

  public logUsage(model: string, usage: any, cost?: number) {
    if (!this.sessionLogDir) return;
    if (cost) this.totalCost += cost;
    
    const usageFile = path.join(this.sessionLogDir, 'usage.jsonl');
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      model,
      ...usage,
      cost
    });
    fs.appendFileSync(usageFile, entry + '\n');
    if (this.chatDir) this.saveSession();
  }

  public logTool(call: { name: string, arguments: any, result?: any, duration?: number, error?: string, call_id?: string }) {
    if (!this.sessionLogDir) return;
    const toolFile = path.join(this.sessionLogDir, 'tools.jsonl');
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      ...call,
      result: typeof call.result === 'string' && call.result.length > 1000 
        ? `${call.result.substring(0, 1000)}... [TRUNCATED]` 
        : call.result
    });
    fs.appendFileSync(toolFile, entry + '\n');
  }

  public logSystem(info: any) {
    if (!this.sessionLogDir) return;
    const systemFile = path.join(this.sessionLogDir, 'system.log');
    const entry = `[${new Date().toISOString()}] [${this.sessionId}] ${JSON.stringify(info)}\n`;
    fs.appendFileSync(systemFile, entry);
  }

  public logFullPrompt(messages: any[]) {
    if (!this.sessionLogDir) return;
    this.promptCount++;
    const timestamp = new Date().toISOString().replace(/T/, '_').replace(/-|:|\./g, '').substring(0, 15);
    const filename = `prompt_${this.promptCount}_${timestamp}.xml`;
    const filePath = path.join(this.sessionLogDir, filename);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<prompt>\n';
    messages.forEach(msg => {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      // Use CDATA to handle special characters. We only need to escape the CDATA end sequence if it exists in content.
      const safeContent = content.replace(/]]>/g, ']]]]><![CDATA[>');
      
      xml += `  <message role="${msg.role}"><![CDATA[${safeContent}]]></message>\n`;
    });
    xml += '</prompt>';

    fs.writeFileSync(filePath, xml);
  }

  public addMessage(role: 'user' | 'assistant' | 'system', content: string | MessageContentPart[], metadata?: any, id?: string) {
    const structuredContent = typeof content === 'string' ? this._parseContent(content) : content;
    this.history.push({ role, content: structuredContent, metadata, id });
    if (this.chatDir) this.saveSession();
    this.log(role, typeof content === 'string' ? content : JSON.stringify(content));
  }

  private _parseContent(text: string): MessageContentPart[] {
    if (!text) return [];

    const parts: MessageContentPart[] = [];
    const blockRegex = /<+(thought|tool_call|tool_response|tool_result)[\s\S]*?(?:<\/\1>|(?=<+(?:thought|tool_call|tool_response|tool_result))|$)/g;

    let lastIdx = 0;
    let match;

    while ((match = blockRegex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        const content = text.substring(lastIdx, match.index);
        if (content.replace(/[<>\s\n]/g, '').length > 0) {
          parts.push({ type: 'message', content: content.trim() });
        }
      }

      const tag = match[1];
      const fullContent = match[0].replace(/^<+/, '<');
      
      let type: MessageContentType = 'message';
      if (tag === 'thought') type = 'thought';
      else if (tag === 'tool_call') type = 'tool_call';
      else if (tag === 'tool_response' || tag === 'tool_result') {
        type = 'user_tool_result';
      }

      parts.push({ type, content: fullContent });
      lastIdx = blockRegex.lastIndex;
    }

    if (lastIdx < text.length) {
      const content = text.substring(lastIdx);
      if (content.replace(/[<>\s\n]/g, '').length > 0) {
        parts.push({ type: 'message', content: content.trim() });
      }
    }

    return parts;
  }

  public getHistory(): ChatMessage[] {
    return [...this.history];
  }

  public restoreHistory(history: ChatMessage[], totalCost?: number) {
    if (totalCost !== undefined) this.totalCost = totalCost;
    // Filter out messages that only contain stray brackets or whitespace
    this.history = history.map(msg => {
      if (Array.isArray(msg.content)) {
        msg.content = msg.content.filter(part => {
          if (part.type === 'message') {
            return part.content.replace(/[<>\s\n]/g, '').length > 0;
          }
          return true;
        });
      }
      return msg;
    }).filter(msg => {
      if (typeof msg.content === 'string') {
        return msg.content.replace(/[<>\s\n]/g, '').length > 0;
      }
      return msg.content.length > 0;
    });
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public getTotalCost(): number {
    return this.totalCost;
  }

  private saveSession() {
    if (!this.chatDir) return;
    const session: ChatSession = {
      session_id: this.sessionId,
      title: this.title,
      last_updated: new Date().toISOString(),
      history: this.history,
      totalCost: this.totalCost
    };
    const chatFile = path.join(this.chatDir, `chat_${this.sessionId}.json`);
    fs.writeFileSync(chatFile, JSON.stringify(session, null, 2));
  }

  private getTimestampForId(): string {
    const now = new Date();
    return now.toISOString().replace(/T/, '_').replace(/-|:|\./g, '').substring(0, 15);
  }
}
