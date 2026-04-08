import argparse
import asyncio
import os
import sys
import shutil

# Ensure we can import from the cli folder
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "cli"))
from mosaic_cli.framework.llm.llama_provider import LlamaProvider
from engine.agent import BenchmarkAgent
from engine.tools import ListDirectoryTool, ReadFileTool, WriteFileTool, RunCommandTool

async def run_benchmark(model_path, case_name):
    print(f"=== Running Benchmark: {case_name} ===")
    print(f"Model: {model_path}")
    
    case_dir = f"cases/{case_name}"
    if not os.path.exists(case_dir):
        print(f"Error: Case {case_name} not found.")
        return False
    
    # Prepare workspace
    original_workspace = os.path.join(case_dir, "workspace")
    temp_workspace = os.path.join(case_dir, "temp_workspace")
    if os.path.exists(temp_workspace):
        shutil.rmtree(temp_workspace)
    shutil.copytree(original_workspace, temp_workspace)
    
    # Initialize provider
    # Note: LlamaProvider requires llama-cpp-python
    provider = LlamaProvider(model_path)
    
    # Initialize tools
    tools = [
        ListDirectoryTool(),
        ReadFileTool(),
        WriteFileTool(),
        RunCommandTool()
    ]
    
    # Initialize agent
    agent = BenchmarkAgent(provider, os.path.basename(model_path), temp_workspace, tools)
    
    # Load task
    task_file = os.path.join(case_dir, "task.md")
    with open(task_file, "r") as f:
        task_content = f.read()
    
    # Run agent
    try:
        await agent.run(task_content)
    except Exception as e:
        print(f"Agent error: {e}")
    
    # Verify
    verify_script = os.path.join(case_dir, "verify.py")
    result = subprocess.run(
        [sys.executable, verify_script, temp_workspace],
        capture_output=True,
        text=True
    )
    
    print("\n=== Benchmark Result ===")
    print(result.stdout)
    if result.returncode == 0:
        print("SUCCESS")
        return True
    else:
        print("FAILURE")
        print(result.stderr)
        return False

import subprocess # Forgot to import it in the async func, adding it here for the script

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Mosaic GGUF Benchmark Runner")
    parser.add_argument("--model", required=True, help="Path to GGUF model file")
    parser.add_argument("--case", default="01_simple_fix", help="Benchmark case name")
    
    args = parser.parse_args()
    
    asyncio.run(run_benchmark(args.model, args.case))
