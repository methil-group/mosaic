import os
import datetime

class Logger:
    """Simple file-based logger for persistent tracking."""
    def __init__(self, log_path: str = "logs/llm_log.txt"):
        self.log_path = log_path
        # Ensure directory exists
        os.makedirs(os.path.dirname(self.log_path), exist_ok=True)

    def log(self, message: str, level: str = "INFO"):
        """Append a message to the log file with a timestamp."""
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        try:
            with open(self.log_path, "a", encoding="utf-8") as f:
                f.write(f"[{timestamp}] [{level}] {message}\n")
        except Exception as e:
            # Fallback to print if file logging fails
            print(f"FAILED TO WRITE TO LOG: {str(e)}")

# Global instance for easy access
llm_logger = Logger()
