import os
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

class SessionManager:
    """Handles chat sessions, history persistence, and workspace directories."""
    
    def __init__(self, workspace: str):
        self.workspace = workspace
        self.mosaic_dir = os.path.join(workspace, ".mosaic")
        self.chats_dir = os.path.join(self.mosaic_dir, "chats")
        self._ensure_directories()

    def _ensure_directories(self):
        os.makedirs(self.mosaic_dir, exist_ok=True)
        os.makedirs(self.chats_dir, exist_ok=True)

    def generate_session_id(self) -> str:
        return datetime.now().strftime("%Y%m%d_%H%M%S_%f")

    def save_chat(self, session_id: str, history: List[Dict[str, str]]):
        if not history:
            return  # Skip saving empty sessions

        path = os.path.join(self.chats_dir, f"chat_{session_id}.json")
        data = {
            "session_id": session_id,
            "last_updated": datetime.now().isoformat(),
            "history": history
        }
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def delete_chat(self, session_id: str):
        path = os.path.join(self.chats_dir, f"chat_{session_id}.json")
        if os.path.exists(path):
            os.remove(path)

    def load_chat(self, session_id: str) -> Optional[List[Dict[str, str]]]:
        path = os.path.join(self.chats_dir, f"chat_{session_id}.json")
        if not os.path.exists(path):
            return None

        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("history", [])
        except Exception:
            return None

    def list_history(self) -> List[Dict[str, Any]]:
        """Lists all saved chat sessions."""
        sessions = []
        if not os.path.exists(self.chats_dir):
            return sessions

        for f in os.listdir(self.chats_dir):
            if f.endswith(".json"):
                try:
                    path = os.path.join(self.chats_dir, f)
                    with open(path, "r", encoding="utf-8") as file:
                        data = json.load(file)
                        history = data.get("history", [])
                        
                        # Delete if it's empty history (useless)
                        if not history:
                            os.remove(path)
                            continue
                            
                        sessions.append({
                            "session_id": data.get("session_id"),
                            "last_updated": data.get("last_updated"),
                            "preview": self._get_preview(history)
                        })
                except Exception:
                    continue
        
        # Sort by date descending
        sessions.sort(key=lambda x: x.get("last_updated", ""), reverse=True)
        return sessions

    def _get_preview(self, history: List[Dict[str, str]]) -> str:
        for msg in history:
            if msg.get("role") == "user":
                content = msg.get("content", "")
                return (content[:40] + "...") if len(content) > 40 else content
        return "New Chat"
