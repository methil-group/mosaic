from src.Core.LLM.openrouter_llm import OpenRouterLLM
import sys

def main():
    llm = OpenRouterLLM("mistralai/devstral-2512")
    
    print(f"Testing streaming connectivity to {llm.model_id}...")
    if not llm.test_connection():
        print("Model connectivity test failed. Exiting.")
        return

    prompt = "Tell me a short story about a cat who codes in python."
    print(f"\nUser: {prompt}\n")
    print("Assistant: ", end="", flush=True)
    
    for chunk in llm.chat_stream(prompt):
        print(chunk, end="", flush=True)
    
    print("\n\nStreaming test completed.")

if __name__ == "__main__":
    main()
