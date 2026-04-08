import argparse
import asyncio
import os
import sys
import shutil
import datetime
import subprocess
import json

# Ensure we can import from the cli folder
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "cli"))
from mosaic_cli.framework.llm.llama_provider import LlamaProvider
from mosaic_cli.framework.llm.openrouter import OpenRouter
from engine.agent import BenchmarkAgent
from engine.tools import ListDirectoryTool, ReadFileTool, WriteFileTool, RunCommandTool

async def run_benchmark(model_path, case_name, provider_type="gguf", api_key=None, verbose=False):
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    log_dir = "logs"
    os.makedirs(log_dir, exist_ok=True)
    
    # Sanitize model name for filename
    model_name_safe = os.path.basename(model_path).replace("/", "_").replace(":", "_")
    log_path = os.path.join(log_dir, f"{model_name_safe}_{case_name}_{timestamp}.log")
    
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
        return False, {}
    
    # Prepare workspace
    original_workspace = os.path.join(case_dir, "workspace")
    temp_workspace = os.path.join(case_dir, "temp_workspace")
    if os.path.exists(temp_workspace):
        shutil.rmtree(temp_workspace)
    shutil.copytree(original_workspace, temp_workspace)
    
    # Initialize provider
    if provider_type == "gguf":
        provider = LlamaProvider(model_path)
    elif provider_type == "openrouter":
        if not api_key:
            print("Error: --api-key is required for OpenRouter")
            return False, {}
        provider = OpenRouter(api_key)
    else:
        print(f"Error: Unsupported provider {provider_type}")
        return False, {}
    
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
    try:
        await agent.run(task_content)
    except Exception as e:
        if verbose:
            print(f"Agent error: {e}")
    
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
        f.write(f"Tool Calls: {json.dumps(agent.tool_counts, indent=2)}\n")
        f.write("\n=== VERIFICATION ===\n")
        f.write(f"Outcome: {outcome}\n")
        f.write(f"STDOUT:\n{result.stdout}\n")
        f.write(f"STDERR:\n{result.stderr}\n")

    if verbose:
        print("\n=== Benchmark Result ===")
        print(result.stdout)
        print(outcome)
        print(f"Tools Used: {agent.tool_counts}")
        if result.returncode != 0:
            print(result.stderr)
            
    return result.returncode == 0, agent.tool_counts

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Mosaic Benchmark Runner")
    parser.add_argument("--model", required=True, help="Model ID (OpenRouter) or path to GGUF file")
    parser.add_argument("--case", help="Benchmark case name (omit to run all cases)")
    parser.add_argument("--provider", choices=["gguf", "openrouter"], default="gguf", help="LLM Provider type")
    parser.add_argument("--api-key", help="API Key for OpenRouter")
    parser.add_argument("--verbose", action="store_true", help="Show full agent output in console")
    
    args = parser.parse_args()
    
    cases_dir = "cases"
    if args.case:
        cases_to_run = [args.case]
    else:
        # Discover all cases
        cases_to_run = sorted([d for d in os.listdir(cases_dir) if os.path.isdir(os.path.join(cases_dir, d))])
    
    print(f"\n🚀 Starting Mosaic Benchmark Suite")
    print(f"Model: {args.model} | Provider: {args.provider}")
    print(f"Total Cases: {len(cases_to_run)}")
    print("-" * 70)
    
    results = []
    for i, case in enumerate(cases_to_run):
        print(f"[{i+1}/{len(cases_to_run)}] Case: {case:30} ", end="", flush=True)
        success, tool_counts = asyncio.run(run_benchmark(args.model, case, args.provider, args.api_key, verbose=args.verbose))
        status = "✅ SUCCESS" if success else "❌ FAILURE"
        
        tools_summary = ", ".join([f"{k}:{v}" for k, v in tool_counts.items()]) if tool_counts else "None"
        print(f"{status:10} | Tools: {tools_summary}")
        results.append((case, status, tools_summary))
    
    print("-" * 70)
    print("Summary:")
    for case, status, tools in results:
        print(f"  {case:30} {status:10} | {tools}")
    print("-" * 70)
