import asyncio
import os
from mosaic_cli.framework.llm.openrouter import OpenRouter
from mosaic_cli.core.config import ConfigManager

async def validate_openrouter():
    config = ConfigManager(".env")
    api_key = config.api_key
    model = config.model or "google/gemini-2.0-flash-001"
    
    print(f"🚀 Initializing OpenRouter with key: {api_key[:10]}...")
    llm = OpenRouter(api_key)
    
    print(f"🔍 Testing model fetching...")
    models = await llm.fetch_models()
    if not models:
        print("❌ FAILED to fetch models. Check your API key.")
        return False
    print(f"✓ Successfully fetched {len(models)} models.")
    
    print(f"💬 Testing live chat stream with model: {model}...")
    messages = [{"role": "user", "content": "Say 'Mosaic is online' in 3 words."}]
    
    found_tokens = False
    try:
        async for chunk in llm.stream_chat(model, messages):
            if chunk.get("type") == "token":
                print(f"TOKEN: {chunk['data']}")
                found_tokens = True
            elif chunk.get("type") == "error":
                print(f"❌ ERROR from provider: {chunk['message']}")
                return False
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
        return False
        
    if found_tokens:
        print("\n✅ LIVE INTEGRATION SUCCESSFUL!")
        return True
    else:
        print("\n❌ FAILED: No tokens received.")
        return False

if __name__ == "__main__":
    success = asyncio.run(validate_openrouter())
    exit(0 if success else 1)
