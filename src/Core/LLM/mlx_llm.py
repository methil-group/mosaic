from mlx_lm import load, generate


class MLXLLM:
    def __init__(self, model_path: str):
        self.model, self.tokenizer = load(model_path)

    def chat(self, prompt):
        response = generate(
            self.model, 
            self.tokenizer, 
            prompt=prompt)
        return response

