import { OpenRouterProvider } from '../src/framework/llm/provider';
import * as fs from 'fs';
import * as path from 'path';

// Helper to get API key from .env
function getApiKey(): string {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/OPENROUTER_API_KEY=(.*)/);
    return match ? match[1].trim() : '';
  }
  return '';
}

const API_KEY = getApiKey();

describe('OpenRouter Models Integration Tests', () => {
  let provider: OpenRouterProvider;

  beforeAll(() => {
    if (!API_KEY) {
      throw new Error('OPENROUTER_API_KEY not found in .env');
    }
    provider = new OpenRouterProvider(API_KEY);
  });

  const models = [
    'deepseek/deepseek-v4-flash',
    'deepseek/deepseek-v4-pro',
    'xiaomi/mimo-v2.5-pro',
    'qwen/qwen3.6-plus'
  ];

  jest.setTimeout(30000);

  models.forEach((model: string) => {
    test(`should be able to chat with ${model}`, async () => {
      const messages = [{ role: 'user' as const, content: 'Say "OK"' }];
      let response = '';
      
      try {
        for await (const event of provider.streamChat(model, messages)) {
          if (event.type === 'token') {
            response += event.data;
          } else if (event.type === 'error') {
            throw new Error(event.message);
          }
        }
        expect(response).toContain('OK');
      } catch (e: any) {
        console.error(`Error testing model ${model}:`, e.message);
        throw e;
      }
    });
  });
});
