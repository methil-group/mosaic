from src.Core.LLM.mlx_llm import MLXLLM

llm = MLXLLM("./models/qwen2.5-coder")
response = llm.chat("What is in this folder ?")
print(response)