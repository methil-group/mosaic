import asyncio
from src.Core.Utils.stream_processor import StreamProcessor
from src.Framework.Utils.logger import llm_logger
from src.Framework.LLM.abstract_llm import AbstractLLM
from typing import List, Dict, Any, Optional
from src.Framework.Tools.tool import Tool
from src.Core.Agent.todo_manager import TodoManager
from src.Core.Tools.tools import TOOLS as STATIC_TOOLS

class Agent:
    def __init__(self, llm: AbstractLLM, verbose: bool = False):
        self.llm = llm
        self.verbose = verbose
        self.todo_manager = TodoManager()

    def _get_tools(self) -> List[Tool]:
        """Combine static tools with dynamic agent tools."""
        return STATIC_TOOLS + [self.todo_manager.get_tool()]

    def _inject_context(self, prompt: str) -> str:
        """Inject todo list context into the prompt."""
        todo_context = self.todo_manager.render()
        return f"Current Todo List:\n{todo_context}\n\nUser Request: {prompt}"

    def chat(self, prompt: str, history: Optional[List[Dict[str, str]]] = None, log_callback: callable = print) -> str:
        full_prompt = self._inject_context(prompt)
        return self.llm.chat(full_prompt, history=history, tools=self._get_tools(), verbose=self.verbose, log_callback=log_callback)

    def chat_stream(self, prompt: str, history: Optional[List[Dict[str, str]]] = None, log_callback: callable = print):
        full_prompt = self._inject_context(prompt)
        return self.llm.chat_stream(full_prompt, history=history, tools=self._get_tools(), verbose=self.verbose, log_callback=log_callback)

    def run(self, prompt: str):
        response = self.chat(prompt)
        return response

    async def run_async(
        self,
        prompt: str,
        on_token: callable = None,
        on_tool_start: callable = None,
        on_tool_output: callable = None,
        on_tool_end: callable = None,
        on_log: callable = None,
        on_error: callable = None
    ):
        """
        Executes the agent loop asynchronously.
        
        Args:
            prompt: User input.
            on_token: Callback(text) for streaming main response.
            on_tool_start: Callback(tool_name, input_str) when tool execution starts.
            on_tool_output: Callback(output_str) for tool output stream (if any).
            on_tool_end: Callback(result_str) when tool finishes.
            on_log: Callback(message, level) for general logging.
            on_error: Callback(exception) for error handling.
        """
        loop = asyncio.get_event_loop()
        stream_processor = StreamProcessor()

        # Helper for logging
        def log(msg: str, level: str = "INFO"):
            if on_log:
                on_log(msg, level)
            if self.verbose:
                print(f"[{level}] {msg}")

        # Internal callback for the sync generator
        def internal_log_callback(msg: str, level: str = "INFO"):
             # We can route this to on_log as well
             log(msg, level)

        try:
            log(f"Starting agent run with prompt: {prompt[:50]}...", "INFO")
            
            # Start the generator in a separate thread to avoid blocking the event loop
            gen = self.run_stream(prompt, log_callback=internal_log_callback)
            
            while True:
                try:
                    # Run next(gen) in executor
                    chunk = await loop.run_in_executor(None, next, gen, None)
                    
                    if chunk is None:
                        log("Stream finished", "DEBUG")
                        break
                    
                    # Process chunk via StreamProcessor
                    try:
                        events = stream_processor.process(chunk)
                        
                        for event_type, content in events:
                            if event_type == 'main':
                                if on_token:
                                    on_token(content)
                            elif event_type == 'start_block':
                                if on_tool_start:
                                    on_tool_start(content) # content is tag/name
                            elif event_type == 'block_content':
                                if on_tool_output:
                                    on_tool_output(content)
                            elif event_type == 'end_block':
                                if on_tool_end:
                                    on_tool_end()
                                    
                    except Exception as e:
                        log(f"Stream processing error: {e}", "ERROR")
                        if on_error:
                            on_error(e)
                        break
                        
                except StopIteration:
                    break
                except Exception as e:
                     log(f"Generator error: {e}", "ERROR")
                     if on_error:
                         on_error(e)
                     break
            
            # Flush remaining buffer
            if stream_processor.buffer:
                if on_token:
                    on_token(stream_processor.buffer)

        except Exception as e:
            log(f"Critical agent error: {e}", "ERROR")
            if on_error:
                on_error(e)

    def run_stream(self, prompt: str, log_callback: callable = print):
        return self.chat_stream(prompt, log_callback=log_callback)
