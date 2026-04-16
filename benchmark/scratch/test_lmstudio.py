import asyncio
import httpx
import json

async def test_lmstudio():
    base_url = "http://localhost:1234/v1"
    headers = {
        "Content-Type": "application/json",
    }
    payload = {
        "model": "nexus-flash-9b",
        "messages": [{"role": "user", "content": "Say hello world briefly."}],
        "stream": True,
        "stream_options": {"include_usage": True}
    }
    
    async with httpx.AsyncClient() as client:
        try:
            async with client.stream("POST", f"{base_url}/chat/completions", headers=headers, json=payload, timeout=10.0) as response:
                print(f"Status: {response.status_code}")
                async for line in response.aiter_lines():
                    print(f"Line: {line}")
        except Exception as e:
            print(f"Error: {e}")

asyncio.run(test_lmstudio())
