import argparse
import asyncio
import os
import sys
import shutil
import datetime
import subprocess
import json
import time
from engine.agent import BenchmarkAgent
from engine.tools import ListDirectoryTool, ReadFileTool, WriteFileTool, RunCommandTool

async def run_benchmark(provider, model_path, case_name, log_dir, provider_type="gguf", verbose=False):
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    os.makedirs(log_dir, exist_ok=True)
    
    log_path = os.path.join(log_dir, f"{case_name}.log")
    
    with open(log_path, "w", encoding="utf-8") as f:
        f.write(f"=== MOSAIC BENCHMARK RUN: {case_name} ===\n")
        f.write(f"Timestamp: {timestamp}\n")
        f.write(f"Model: {model_path}\n")
        f.write(f"Provider: {provider_type}\n\n")

    if verbose:
        print(f"=== Running Benchmark: {case_name} ===")
        print(f"Model: {model_path}")
        print(f"Logging to: {log_path}")
    
    case_dir = os.path.join("cases", case_name)
    if not os.path.exists(case_dir):
        print(f"Error: Case {case_name} not found at {case_dir}")
        return False, {}, 0, 0
    
    # Prepare workspace
    original_workspace = os.path.join(case_dir, "workspace")
    temp_workspace = os.path.join(case_dir, "temp_workspace")
    if os.path.exists(temp_workspace):
        shutil.rmtree(temp_workspace)
    shutil.copytree(original_workspace, temp_workspace)
    
    # Initialize tools
    tools = [
        ListDirectoryTool(),
        ReadFileTool(),
        WriteFileTool(),
        RunCommandTool()
    ]
    
    # Initialize agent
    agent = BenchmarkAgent(provider, os.path.basename(model_path), temp_workspace, tools, log_path=log_path, verbose=verbose)
    
    # Load task
    task_file = os.path.join(case_dir, "task.md")
    with open(task_file, "r") as f:
        task_content = f.read()
    
    # Run agent
    start_time = time.time()
    try:
        await agent.run(task_content)
    except Exception as e:
        if verbose:
            print(f"Agent error: {e}")
    end_time = time.time()
    duration = end_time - start_time
    
    # Verify
    verify_script = os.path.join(case_dir, "verify.py")
    result = subprocess.run(
        [sys.executable, verify_script, temp_workspace],
        capture_output=True,
        text=True
    )
    
    outcome = "SUCCESS" if result.returncode == 0 else "FAILURE"
    
    with open(log_path, "a", encoding="utf-8") as f:
        f.write("\n=== METRICS ===\n")
        f.write(f"Duration: {duration:.2f}s\n")
        f.write(f"Tokens: {agent.total_tokens}\n")
        f.write(f"TPS: {agent.total_tokens / duration if duration > 0 else 0:.2f}\n")
        f.write(f"Tool Calls: {json.dumps(agent.tool_counts, indent=2)}\n")
        f.write("\n=== VERIFICATION ===\n")
        f.write(f"Outcome: {outcome}\n")
        f.write(f"STDOUT:\n{result.stdout}\n")
        f.write(f"STDERR:\n{result.stderr}\n")

    if verbose:
        print("\n=== Benchmark Result ===")
        print(f"Duration: {duration:.2f}s")
        print(result.stdout)
        print(outcome)
        print(f"Tools Used: {agent.tool_counts}")
        if result.returncode != 0:
            print(result.stderr)
            
    return result.returncode == 0, agent.tool_counts, duration, agent.total_tokens

async def main():
    parser = argparse.ArgumentParser(description="Mosaic Benchmark Runner")
    parser.add_argument("--model", help="Model ID (OpenRouter/LMStudio) or path to GGUF file")
    parser.add_argument("--case", help="Benchmark case name (omit to run all cases)")
    parser.add_argument("--provider", choices=["gguf", "openrouter", "hf", "lmstudio"], default="gguf", help="LLM Provider type")
    parser.add_argument("--api-key", help="API Key for OpenRouter")
    parser.add_argument("--base-url", help="Base URL for LM Studio (default: http://localhost:1234/v1)")
    parser.add_argument("--4bit", action="store_true", default=True, help="Load HF model in 4-bit quantization")
    parser.add_argument("--verbose", action="store_true", help="Show full agent output in console")
    parser.add_argument("--parallel", action="store_true", help="Run cases in parallel")
    parser.add_argument("--concurrency", type=int, default=5, help="Number of simultaneous cases (default: 5)")
    
    args = parser.parse_args()

    # Ensure we can import from the cli folder
    sys.path.append(os.path.join(os.path.dirname(__file__), "..", "cli"))

    # Initialize provider
    provider = None
    model_path = args.model

    if args.provider == "gguf":
        from mosaic_cli.framework.llm.llama_provider import LlamaProvider
        if not model_path:
            print("Error: --model (path to GGUF) is required for gguf provider")
            return
        provider = LlamaProvider(model_path)
    elif args.provider == "openrouter":
        from mosaic_cli.framework.llm.openrouter import OpenRouter
        if not args.api_key:
            print("Error: --api-key is required for OpenRouter")
            return
        provider = OpenRouter(args.api_key)
    elif args.provider == "hf":
        from mosaic_cli.framework.llm.huggingface import HuggingFaceProvider
        if not model_path:
            print("Error: --model (HF repo ID) is required for hf provider")
            return
        provider = HuggingFaceProvider(model_path, load_in_4bit=getattr(args, '4bit'))
    elif args.provider == "lmstudio":
        from mosaic_cli.framework.llm.lmstudio import LmStudioProvider
        provider = LmStudioProvider(base_url=args.base_url or "http://localhost:1234/v1")
    
    if not provider:
        print(f"Error: Could not initialize provider {args.provider}")
        return

    # Interactive model selection if model is not specified
    if not model_path and hasattr(provider, 'fetch_models'):
        print(f"Fetching available models from {args.provider}...")
        available_models = await provider.fetch_models()
        if not available_models:
            print(f"No models found for provider {args.provider}. Please specify --model manually.")
            return
        
        print("\nAvailable models:")
        for i, m in enumerate(available_models):
            print(f"  [{i}] {m}")
        
        while True:
            try:
                choice = input(f"\nSelect a model (0-{len(available_models)-1}): ")
                idx = int(choice)
                if 0 <= idx < len(available_models):
                    model_path = available_models[idx]
                    break
            except (ValueError, IndexError):
                pass
            print("Invalid selection. Try again.")

    if not model_path:
        print("Error: Model must be specified via --model or interactive selection.")
        return
    
    cases_dir = "cases"
    if args.case:
        cases_to_run = [args.case]
    else:
        # Discover all cases
        cases_to_run = sorted([d for d in os.listdir(cases_dir) if os.path.isdir(os.path.join(cases_dir, d))])
    
    # Session setup
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    model_name_safe = os.path.basename(model_path).replace("/", "_").replace(":", "_")
    session_dir = os.path.join("logs", f"{model_name_safe}_{timestamp}")
    os.makedirs(session_dir, exist_ok=True)

    print(f"\n🚀 Starting Mosaic Benchmark Suite")
    print(f"Model: {model_path} | Provider: {args.provider}")
    print(f"Total Cases: {len(cases_to_run)}")
    print(f"Session Log Directory: {session_dir}")
    if args.parallel:
        print(f"Mode: Parallel (Concurrency: {args.concurrency})")
    print("-" * 70)
    
    results = []
    total_tool_counts = {}
    total_duration = 0
    total_tokens = 0

    def aggregate_counts(counts):
        for tool, count in counts.items():
            total_tool_counts[tool] = total_tool_counts.get(tool, 0) + count

    if args.parallel:
        semaphore = asyncio.Semaphore(args.concurrency)
        
        async def run_with_semaphore(case_name, index, total):
            async with semaphore:
                print(f"  [START] {case_name}")
                success, tool_counts, duration, tokens = await run_benchmark(provider, model_path, case_name, session_dir, args.provider, verbose=args.verbose)
                status = "✅ SUCCESS" if success else "❌ FAILURE"
                tools_summary = ", ".join([f"{k}:{v}" for k, v in tool_counts.items()]) if tool_counts else "None"
                print(f"  [FINISH] {case_name:30} {status} ({duration:.2f}s) | {tokens} tokens ({tokens/duration if duration > 0 else 0:.2f} TPS)")
                return (case_name, status, tools_summary, tool_counts, duration, tokens)

        tasks = [run_with_semaphore(case, i, len(cases_to_run)) for i, case in enumerate(cases_to_run)]
        raw_results = await asyncio.gather(*tasks)
        for case_name, status, tools_summary, tool_counts, duration, tokens in raw_results:
            results.append((case_name, status, tools_summary, duration, tokens))
            aggregate_counts(tool_counts)
            total_duration += duration
            total_tokens += tokens
    else:
        for i, case in enumerate(cases_to_run):
            print(f"[{i+1}/{len(cases_to_run)}] Case: {case:30} ", end="", flush=True)
            success, tool_counts, duration, tokens = await run_benchmark(provider, model_path, case, session_dir, args.provider, verbose=args.verbose)
            status = "✅ SUCCESS" if success else "❌ FAILURE"
            tools_summary = ", ".join([f"{k}:{v}" for k, v in tool_counts.items()]) if tool_counts else "None"
            print(f"{status:10} | Duration: {duration:6.2f}s | TPS: {tokens/duration if duration > 0 else 0:5.2f} | Tools: {tools_summary}")
            results.append((case, status, tools_summary, duration, tokens))
            aggregate_counts(tool_counts)
            total_duration += duration
            total_tokens += tokens
    
    avg_duration = total_duration / len(cases_to_run) if cases_to_run else 0
    pass_count = sum(1 for r in results if "SUCCESS" in r[1])
    total_count = len(results)
    pass_rate = (pass_count / total_count * 100) if total_count > 0 else 0
    
    # Generate Recap.md
    recap_path = os.path.join(session_dir, "recap.md")
    with open(recap_path, "w", encoding="utf-8") as f:
        f.write(f"# Mosaic Benchmark Recap\n\n")
        f.write(f"- **Model**: {model_path}\n")
        f.write(f"- **Provider**: {args.provider}\n")
        f.write(f"- **Timestamp**: {timestamp}\n")
        f.write(f"- **Log Directory**: `{session_dir}`\n")
        f.write(f"- **Average Time per Test**: `{avg_duration:.2f}s`\n")
        f.write(f"- **Average TPS**: `{total_tokens / total_duration if total_duration > 0 else 0:.2f} tokens/s`\n")
        f.write(f"- **Global Score**: `{pass_count}/{total_count} ({pass_rate:.1f}%)`\n\n")
        
        f.write("## Results Summary\n\n")
        f.write("| Case | Status | Duration | TPS | Tools Used |\n")
        f.write("| :--- | :--- | :--- | :--- | :--- |\n")
        for case, status, tools, duration, tokens in results:
            f.write(f"| {case} | {status} | {duration:.2f}s | {tokens/duration if duration > 0 else 0:.2f} | {tools} |\n")
        
        f.write("\n## Total Tool Usage by Category\n\n")
        
        # Define categories
        categories = {
            "File Operations": ["list_directory", "read_file", "write_file"],
            "System Operations": ["run_command"]
        }
        
        for cat_name, tools in categories.items():
            cat_total = sum(total_tool_counts.get(t, 0) for t in tools)
            f.write(f"### {cat_name}: {cat_total}\n")
            for t in tools:
                if t in total_tool_counts:
                    f.write(f"- **{t}**: {total_tool_counts[t]}\n")
            f.write("\n")

    print("-" * 70)
    print("Summary:")
    for case, status, tools, duration, tokens in results:
        print(f"  {case:30} {status:10} | {tools}")
    print("-" * 70)
    print(f"Global Score: {pass_count}/{total_count} ({pass_rate:.1f}%)")
    print(f"Full recap saved to: {recap_path}")

if __name__ == "__main__":
    asyncio.run(main())
