import { BaseLlmProvider, LMStudioProvider, OpenRouterProvider } from '../src/framework/llm/provider';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('LLM Providers', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('BaseLlmProvider', () => {
        it('fetchModels should return a list of model IDs on success', async () => {
            const provider = new BaseLlmProvider('test-key', 'http://test-url');
            mockedAxios.get.mockResolvedValueOnce({
                status: 200,
                data: {
                    data: [{ id: 'model-1' }, { id: 'model-2' }]
                }
            });

            const models = await provider.fetchModels();
            expect(models).toEqual(['model-1', 'model-2']);
            expect(mockedAxios.get).toHaveBeenCalledWith('http://test-url/models', expect.any(Object));
        });

        it('fetchModels should return an empty array on failure', async () => {
            const provider = new BaseLlmProvider('test-key', 'http://test-url');
            mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

            const models = await provider.fetchModels();
            expect(models).toEqual([]);
        });
    });

    describe('LMStudioProvider', () => {
        it('should initialize with localhost URL and dummy key', () => {
            const provider = new LMStudioProvider();
            expect((provider as any).baseUrl).toBe('http://localhost:1234/v1');
            expect((provider as any).apiKey).toBe('lm-studio');
        });
    });

    describe('OpenRouterProvider', () => {
        it('should initialize with correct URL and headers', () => {
            const provider = new OpenRouterProvider('openrouter-key');
            expect((provider as any).baseUrl).toBe('https://openrouter.ai/api/v1');
            expect((provider as any).apiKey).toBe('openrouter-key');
            expect((provider as any).headers['HTTP-Referer']).toBe('https://mosaic.methil.group');
        });
    });
});
