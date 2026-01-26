from src.Core.LLM.mlx_llm import MLXLLM
from src.Core.Agent.agent import Agent

def main():
    llm = MLXLLM("./models/qwen3-8b-vl")
    agent = Agent(llm)
    
    prompt = """
    Add comment in main.py of what it is doing here.
    """
    print(f"User: {prompt}")
    
    response = agent.run(prompt)
    print("\nAgent Response:")
    print(response)

if __name__ == "__main__":
    main()
