from src.Core.LLM.mlx_llm import MLXLLM

llm = MLXLLM("./models/qwen2.5-coder")
response = llm.chat("Hello who are you and how are you?")
print(response)