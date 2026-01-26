from dataclasses import dataclass
from typing import Dict, Any, Optional, Callable


@dataclass
class Tool:
    name: str
    function: Callable
    description: str = ""
    parameters: Optional[Dict[str, Any]] = None