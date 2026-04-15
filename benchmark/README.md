# Mosaic Agentic Coding Benchmark

This folder contains a battery of tests to evaluate the agentic coding capabilities of LLMs, specifically targeting GGUF models running locally.

## Setup

1. **Install Dependencies**:
   You need `llama-cpp-python` installed.
   ```bash
   pip install llama-cpp-python
   ```

2. **GGUF Model**:
   Have a GGUF model file ready (e.g., Qwen2.5-Coder-7B-Instruct-GGUF).

## Running the Benchmark

Run the runner script with the path to your model:

```bash
# For local GGUF:
python runner.py --model /path/to/your/model.gguf --case 01_simple_fix --provider gguf

# For OpenRouter:
python runner.py --model deepseek/deepseek-v3.2 --case 01_simple_fix --provider openrouter --api-key YOUR_KEY
```

## Structure

- `runner.py`: The orchestrator that sets up the workspace, runs the agent, and verifies the result.
- `providers/`: Adapters for different LLM backends (currently `llama_provider.py` for direct GGUF loading).
- `engine/`: The core agent logic and tools.
- `cases/`: The actual benchmark tests.
    - Each case has a `workspace/` (initial state), `task.md` (instructions), and `verify.py` (success check).

## Adding New Tests

1. Create a new folder in `cases/`.
2. Add a `workspace/` folder with some code.
3. Add a `task.md` with the prompt for the agent.
4. Add a `verify.py` that returns exit code 0 on success and 1 on failure.
