import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, TextIteratorStreamer
from typing import AsyncIterable, List, Dict, Any
import asyncio
import platform
from threading import Thread
from .base import LlmProvider

class HuggingFaceProvider(LlmProvider):
    def __init__(self, model_id: str, device: str = "auto", load_in_4bit: bool = True):
        self.model_id = model_id
        self.device = device
        self.load_in_4bit = load_in_4bit
        self._model = None
        self._tokenizer = None

    def _get_model_and_tokenizer(self):
        if self._model is None:
            print(f"🔍 [HF] Loading tokenizer for {self.model_id}...")
            self._tokenizer = AutoTokenizer.from_pretrained(self.model_id, trust_remote_code=True)
            
            # Detect Mac
            is_mac = platform.system() == "Darwin"
            
            print(f"🚀 [HF] Loading model {self.model_id} (Quantization Request: {self.load_in_4bit})...")
            
            load_kwargs = {
                "device_map": self.device,
                "torch_dtype": torch.float16,
                "trust_remote_code": True
            }
            
            if self.load_in_4bit:
                if is_mac:
                    print("⚠️  [HF] Note: bitsandbytes (4-bit) is not natively supported on Mac MPS. Continuing with FP16/BF16.")
                else:
                    try:
                        from transformers import BitsAndBytesConfig
                        load_kwargs["quantization_config"] = BitsAndBytesConfig(load_in_4bit=True)
                        print("💎 [HF] Using BitsAndBytes 4-bit quantization.")
                    except ImportError:
                        print("⚠️  [HF] bitsandbytes not found. Continuing without quantization.")
            
            try:
                self._model = AutoModelForCausalLM.from_pretrained(self.model_id, **load_kwargs)
                print(f"✅ [HF] Model loaded on {getattr(self._model, 'device', 'unknown')}")
            except Exception as e:
                # Fallback for weird architecture mismatches
                if "unexpected keyword argument 'load_in_4bit'" in str(e) or "quantization_config" in str(e):
                    print("⚠️  [HF] Standard quantization failed. Retrying with minimal config...")
                    self._model = AutoModelForCausalLM.from_pretrained(
                        self.model_id, 
                        device_map=self.device,
                        trust_remote_code=True
                    )
                else:
                    print(f"❌ [HF] Error loading model: {str(e)}")
                    raise e
                
        return self._model, self._tokenizer

    async def stream_chat(self, model: str, messages: List[Dict[str, str]]) -> AsyncIterable[Dict[str, Any]]:
        model_obj, tokenizer = self._get_model_and_tokenizer()

        # Format prompt (simple chat template handling)
        prompt = ""
        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            if role == "system":
                prompt += f"<|system|>\n{content}<|end|>\n"
            elif role == "user":
                prompt += f"<|user|>\n{content}<|end|>\n"
            elif role == "assistant":
                prompt += f"<|assistant|>\n{content}<|end|>\n"
        
        prompt += "<|assistant|>\n"

        inputs = tokenizer(prompt, return_tensors="pt").to(model_obj.device)
        input_ids = inputs["input_ids"]
        
        streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)
        
        generation_kwargs = dict(
            input_ids=input_ids,
            streamer=streamer,
            max_new_tokens=4096,
            do_sample=True,
            temperature=0.7,
            top_p=0.9
        )

        # Thread-safe error capture
        gen_error = []
        def run_gen():
            try:
                model_obj.generate(**generation_kwargs)
            except Exception as e:
                gen_error.append(e)

        # Run generation in a separate thread
        thread = Thread(target=run_gen)
        thread.start()
        print("🕒 [HF] Generation started...")

        generated_text = ""
        token_count = 0
        
        # Use an executor to poll the streamer without blocking
        loop = asyncio.get_event_loop()
        
        while thread.is_alive() or not streamer.text_queue.empty():
            if gen_error:
                print(f"❌ [HF] Generation thread error: {gen_error[0]}")
                yield {"type": "error", "message": str(gen_error[0])}
                break
                
            try:
                # TextIteratorStreamer puts text chunks in the queue
                # We need to wait for them or timeout
                text = await loop.run_in_executor(None, lambda: next(streamer, None))
                if text:
                    generated_text += text
                    token_count += 1 # Rough estimate if we don't count real tokens here
                    yield {"type": "token", "data": text}
            except StopIteration:
                break
            await asyncio.sleep(0.01)
        
        if token_count == 0:
             print("⚠️  [HF] Warning: Generation finished without producing any tokens.")

        # Send final tool response usage data
        # In a real scenario, we'd use the actual token count from the tokenizer
        actual_token_count = len(tokenizer.encode(generated_text))
        yield {
            "type": "usage",
            "data": {
                "prompt_tokens": len(input_ids[0]),
                "completion_tokens": actual_token_count,
                "total_tokens": len(input_ids[0]) + actual_token_count
            }
        }

    async def fetch_models(self) -> List[str]:
        return [self.model_id]
