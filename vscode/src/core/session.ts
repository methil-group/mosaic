import * as fs from 'fs';
import * as path from 'path';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: any;
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
  private title: string = "New Chat";
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

      if (!fs.existsSync(this.chatDir)) {
        fs.mkdirSync(this.chatDir, { recursive: true });
      }
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } else {
      this.chatDir = '';
      this.logDir = '';
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

  public addMessage(role: 'user' | 'assistant' | 'system', content: string, metadata?: any) {
    this.history.push({ role, content, metadata });
    if (this.chatDir) this.saveSession();
    this.log(role, content);
  }

  public getHistory(): ChatMessage[] {
    return [...this.history];
  }

  public restoreHistory(history: ChatMessage[]) {
    this.history = [...history];
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
