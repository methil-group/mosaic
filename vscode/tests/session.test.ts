import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SessionManager } from '../src/core/session';

describe('SessionManager', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `mosaic-test-${Date.now()}`);
    fs.mkdirSync(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should create .mosaic structure on initialization', () => {
    new SessionManager(tempDir);
    expect(fs.existsSync(path.join(tempDir, '.mosaic', 'chats'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.mosaic', 'logs'))).toBe(true);
  });

  it('should save a message to the chat JSON file', () => {
    const sm = new SessionManager(tempDir);
    sm.addMessage('user', 'Hello Test');
    
    // Find the chat file
    const chatFiles = fs.readdirSync(path.join(tempDir, '.mosaic', 'chats'));
    expect(chatFiles.length).toBe(1);
    expect(chatFiles[0]).toMatch(/^chat_.*\.json$/);

    const chatContent = JSON.parse(fs.readFileSync(path.join(tempDir, '.mosaic', 'chats', chatFiles[0]), 'utf-8'));
    expect(chatContent.history[0]).toEqual({ 
      role: 'user', 
      content: [{ type: 'message', content: 'Hello Test' }] 
    });
  });

  it('should append lines to the log file', () => {
    const sm = new SessionManager(tempDir);
    sm.log('test', 'Log message');
    
    const logFiles = fs.readdirSync(path.join(tempDir, '.mosaic', 'logs'));
    expect(logFiles.length).toBe(1);
    expect(logFiles[0]).toMatch(/^session_.*\.log$/);

    const logContent = fs.readFileSync(path.join(tempDir, '.mosaic', 'logs', logFiles[0]), 'utf-8');
    expect(logContent).toContain('[TEST] Log message');
  });

  it('should generate a unique session ID', () => {
    const sm1 = new SessionManager(tempDir);
    const sm2 = new SessionManager(tempDir);
    expect((sm1 as any).sessionId).not.toBe((sm2 as any).sessionId);
  });
});
