import pytest
import os
from mosaic_cli.main import Mosaic

@pytest.mark.asyncio
async def test_e2e_live_openrouter(temp_workspace):
    """
    REAL E2E test using live OpenRouter connection.
    This test verifies that the stream actually populates the UI.
    """
    # Ensure we use the real config
    # Note: Mosaic() by default uses ~/.mosaic.env and the current workspace.
    # We will point it to the temporary workspace for history/sessions.
    app = Mosaic(workspace=temp_workspace)
    
    # Verify we are NOT mocked
    assert not hasattr(app.llm, "mocked") # A simple check if we are using real providers

    async with app.run_test() as pilot:
        # 1. Check startup
        await pilot.pause()
        
        # 2. Send a real message
        await pilot.press(*"Hello".split()) # Typing 'Hello'
        await pilot.press("enter")
        
        # 3. Wait for the assistant to start responding
        # We'll wait up to 15 seconds for a real response
        # In Textual tests, we check if the chat area has more messages
        # or if the loading indicator is gone.
        
        print("Waiting for live LLM response...")
        # We wait for the 'Thinking...' to change or for a new ChatMessage
        # Actually, let's wait for the response stream to finish.
        # We can check app.history
        
        import time
        start_time = time.time()
        while time.time() - start_time < 20:
            await pilot.pause(0.5)
            # Check if history has an assistant message with some content
            assist_msgs = [m for m in app.history if m.get("role") == "assistant" and len(m.get("content", "")) > 2]
            if assist_msgs:
                break
        
        # Assertions
        assist_msgs = [m for m in app.history if m.get("role") == "assistant"]
        assert len(assist_msgs) > 0, "No assistant response received from live API"
        assert len(assist_msgs[0].get("content", "")) > 0, "Assistant response is empty"
        print(f"Verified live response: {assist_msgs[0]['content'][:50]}...")

        # 4. Final check of session persistence
        app.save_chat()
        session_files = os.listdir(os.path.join(temp_workspace, ".mosaic", "chats"))
        assert len(session_files) > 0, "Live session was not persisted"
