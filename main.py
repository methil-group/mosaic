# This script demonstrates how to use the MLXLLM class to interact with a language model
# It initializes the model, sends a chat message, and prints the response

# Import the MLXLLM class from the source code
from src.Core.LLM.mlx_llm import MLXLLM

# Create an instance of MLXLLM with the specified model path
# The model path points to the qwen2.5-coder model in the models directory
llm = MLXLLM("./models/qwen2.5-coder")

# Use the chat method to send a message to the language model
# The message asks "What is in this folder ?" to demonstrate the model's response capability
response = llm.chat("What is in this folder ?")

# Print the model's response to the console
print(response)