import os
from dotenv import load_dotenv, set_key
from typing import Optional

def _get_version():
    try:
        # VERSION file is at the root of the project
        v_path = os.path.join(os.path.dirname(__file__), "..", "..", "VERSION")
        if os.path.exists(v_path):
            with open(v_path, "r") as f:
                return f.read().strip()
    except Exception:
        pass
    return "0.1.0"

MOSAIC_VERSION = _get_version()

class ConfigManager:
    """Handles global configuration and environment variables for Mosaic."""
    
    def __init__(self, config_path: str):
        self.config_path = os.path.expanduser(config_path)
        self._ensure_config_exists()
        load_dotenv(self.config_path)

    def _ensure_config_exists(self):
        if not os.path.exists(self.config_path):
            with open(self.config_path, "w", encoding="utf-8") as f:
                f.write("# Mosaic Configuration\n")

    def get(self, key: str, default: Optional[str] = None) -> Optional[str]:
        return os.getenv(key, default)

    def set(self, key: str, value: str):
        set_key(self.config_path, key, value)
        # Reload environment to ensure os.getenv sees the change
        load_dotenv(self.config_path, override=True)

    @property
    def api_key(self) -> str:
        return self.get("OPENROUTER_API_KEY", "")

    @property
    def openai_key(self) -> str:
        return self.get("OPENAI_API_KEY", "")

    @property
    def lmstudio_url(self) -> str:
        return self.get("LM_STUDIO_URL", "http://localhost:1234/v1")

    @property
    def model(self) -> str:
        return self.get("MOSAIC_MODEL", "qwen/qwen3.5-27b")

    @property
    def provider(self) -> str:
        return self.get("MOSAIC_PROVIDER", "openrouter")

    @property
    def agent_mode(self) -> str:
        return self.get("MOSAIC_MODE", "agent")
