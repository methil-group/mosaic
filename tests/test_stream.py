from src.Core.Agent.agent import Agent
from src.Core.LLM.openrouter_llm import OpenRouterLLM
import asyncio
import os

async def main():
    llm = OpenRouterLLM("mistralai/devstral-2512")
    agent = Agent(llm, verbose=True)
    
    prompt = "Create a python script to hello world"
    print(f"Testing stream with prompt: {prompt}")
    
    try:
        gen = agent.run_stream(prompt)
        print("Generator created.")
        
        for chunk in gen:
            print(f"Chunk received: {repr(chunk)}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Just run sync for now as agent.run_stream seems to return a sync generator based on code
    # Wait, agent.run_stream calls chat_stream which calls _generate_stream which yields.
    # So it is a sync generator.
    
    llm = OpenRouterLLM("mistralai/devstral-2512")
    agent = Agent(llm, verbose=True)
    
    prompt = "Create a python script to hello world"
    print(f"Testing stream with prompt: {prompt}")
    
    from src.Framework.Utils.stream_processor import StreamProcessor
    processor = StreamProcessor()
    
    gen = agent.run_stream(prompt)
    print("Generator created.")
    
    count = 0
    for chunk in gen:
        count += 1
        print(f"Chunk {count}: {repr(chunk)}")
        events = processor.process(chunk)
        print(f"  Events: {events}")
        
    print("Done")
