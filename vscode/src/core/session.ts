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
}

export class SessionManager {
  private sessionId: string;
  private chatDir: string;
  private logDir: string;
  private sessionLogDir: string = '';
  private promptCount = 0;
  private title = "New Chat";
  private history: ChatMessage[] = [];
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
    if (!this.logDir) return;
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${role.toUpperCase()}] ${message}\n`;
    const logFile = path.join(this.logDir, `session_${this.sessionId.split('_')[0]}.log`);
    fs.appendFileSync(logFile, logLine);
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

  public restoreHistory(history: ChatMessage[]) {
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

  private saveSession() {
    if (!this.chatDir) return;
    const session: ChatSession = {
      session_id: this.sessionId,
      title: this.title,
      last_updated: new Date().toISOString(),
      history: this.history
    };
    const chatFile = path.join(this.chatDir, `chat_${this.sessionId}.json`);
    fs.writeFileSync(chatFile, JSON.stringify(session, null, 2));
  }

  private getTimestampForId(): string {
    const now = new Date();
    return now.toISOString().replace(/T/, '_').replace(/-|:|\./g, '').substring(0, 15);
  }
}
