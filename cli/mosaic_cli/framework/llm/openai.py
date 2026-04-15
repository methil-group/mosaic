import httpx
import json
from typing import AsyncIterable, List, Dict, Any
from .base import LlmProvider

class OpenAiProvider(LlmProvider):
    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")

    async def stream_chat(self, model: str, messages: List[Dict[str, str]]) -> AsyncIterable[Dict[str, Any]]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        
        payload = {
            "model": model,
            "messages": messages,
            "stream": True,
        }

        async with httpx.AsyncClient() as client:
            try:
                async with client.stream("POST", f"{self.base_url}/chat/completions", headers=headers, json=payload, timeout=60.0) as response:
                    if response.status_code != 200:
                        detail = await response.aread()
                        yield {"type": "error", "message": f"OpenAI HTTP {response.status_code}: {detail.decode()}"}
                        return

                    async for line in response.aiter_lines():
                        line = line.strip()
                        if not line or not line.startswith("data: "):
                            continue

                        data = line[6:]
                        if data == "[DONE]":
                            continue

                        try:
                            chunk = json.loads(data)
                            if "usage" in chunk:
                                yield {"type": "usage", "data": chunk["usage"]}
                            
                            delta = chunk.get("choices", [{}])[0].get("delta", {})
                            if "content" in delta:
                                yield {"type": "token", "data": delta["content"]}
                        except json.JSONDecodeError:
                            continue
            except Exception as e:
                yield {"type": "error", "message": f"Connection Error: {str(e)}"}

    async def fetch_models(self) -> List[str]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(f"{self.base_url}/models", headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    return [m["id"] for m in data.get("data", [])]
            except:
                pass
        return []
