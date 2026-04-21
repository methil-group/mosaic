import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
from mosaic_cli.framework.llm.openrouter import OpenRouter
from mosaic_cli.framework.llm.openai import OpenAiProvider

@pytest.mark.asyncio
async def test_openrouter_payload_formatting():
    provider = OpenRouter(api_key="test-key")
    messages = [{"role": "user", "content": "hi"}]
    
    mock_response = MagicMock()
    mock_response.status_code = 200
    
    async def mock_aiter_lines():
        yield "data: " + json.dumps({"choices": [{"delta": {"content": "Hello"}}]})
        yield "data: [DONE]"
    
    mock_response.aiter_lines = mock_aiter_lines
    
    with patch("httpx.AsyncClient.stream") as mock_stream:
        # Construct an async context manager
        mock_stream.return_value.__aenter__.return_value = mock_response
        mock_stream.return_value.__aexit__.return_value = None
        
        events = []
        async for event in provider.stream_chat("test-model", messages):
            events.append(event)
        
        assert len(events) >= 1
        assert events[0]["type"] == "token"
        assert events[0]["data"] == "Hello"

@pytest.mark.asyncio
async def test_openai_provider_error_handling():
    provider = OpenAiProvider(api_key="test-key", base_url="https://api.openai.com/v1")
    
    mock_response = MagicMock()
    mock_response.status_code = 401
    mock_response.aread = AsyncMock(return_value=b"Unauthorized")
    
    with patch("httpx.AsyncClient.stream") as mock_stream:
        mock_stream.return_value.__aenter__.return_value = mock_response
        mock_stream.return_value.__aexit__.return_value = None
        
        events = []
        async for event in provider.stream_chat("test-model", []):
            events.append(event)
        
        assert any(e["type"] == "error" and "401" in e["message"] for e in events)

@pytest.mark.asyncio
async def test_openrouter_missing_key():
    provider = OpenRouter(api_key="")
    events = []
    async for event in provider.stream_chat("model", []):
        events.append(event)
    assert events[0]["type"] == "error"
    assert "Key not found" in events[0]["message"]
