from src.Core.LLM.mlx_llm import MLXLLM
from src.Core.Agent.agent import Agent

def main():
    llm = MLXLLM("./models/qwen3-8b-vl")
    agent = Agent(llm)
    
    prompt = """
    Find all python files in the src/Core directory using bash and tell me if there is a LLM folder.
    If there is one, analyze the content of the file in them and explain it to me.
    Also explain the WHOLE architecture of the project (every folders etc) like I am a noobie.
    """
    print(f"User: {prompt}")
    
    response = agent.run(prompt)
    print("\nAgent Response:")
    print(response)

if __name__ == "__main__":
    main()
