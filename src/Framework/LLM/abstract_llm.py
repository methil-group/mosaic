from abc import ABC, abstractmethod


class AbstractLLM(ABC):
    @abstractmethod
    def __init__(self, model_path: str):
        pass

    @abstractmethod
    def chat(self, prompt):
        pass