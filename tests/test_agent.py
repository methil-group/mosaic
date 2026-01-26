from src.Core.LLM.mlx_llm import MLXLLM
from src.Core.Agent.agent import Agent
from src.Core.LLM.openrouter_llm import OpenRouterLLM

def main():
    # llm = MLXLLM("./models/qwen3-8b-vl")
    # llm = MLXLLM("./models/qwen2.5-coder")
    llm = OpenRouterLLM("mistralai/devstral-2512")
    
    print(f"Testing connectivity to {llm.model_id}...")
    if not llm.test_connection():
        print("Model connectivity test failed. Exiting.")
        return

    agent = Agent(llm, verbose=True)
    
    prompt = """
    Add comment in main.py of what it is doing here. and comment on every lines.
    """
    print(f"User: {prompt}")
    
    response = agent.run(prompt)
    print("\nAgent Response:")
    print(response)

if __name__ == "__main__":
    main()
