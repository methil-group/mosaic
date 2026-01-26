import os

class FileUtils:
    @staticmethod
    def read_file(path: str) -> str:
        """
        Reads the content of a file.
        """
        try:
            with open(path, 'r') as f:
                return f.read()
        except Exception as e:
            return f"Error reading file: {str(e)}"

    @staticmethod
    def write_file(path: str, content: str) -> str:
        """
        Writes content to a file, overwriting existing content.
        """
        try:
            with open(path, 'w') as f:
                f.write(content)
            return f"Successfully wrote to {path}"
        except Exception as e:
            return f"Error writing file: {str(e)}"

    @staticmethod
    def replace_content(path: str, old_text: str, new_text: str) -> str:
        """
        Replaces occurrences of old_text with new_text in a file.
        """
        try:
            if not os.path.exists(path):
                return f"Error: File {path} does not exist"
            
            with open(path, 'r') as f:
                content = f.read()
            
            if old_text not in content:
                return f"Error: '{old_text}' not found in {path}"
                
            new_content = content.replace(old_text, new_text)
            
            with open(path, 'w') as f:
                f.write(new_content)
                
            return f"Successfully replaced content in {path}"
        except Exception as e:
            return f"Error replacing content: {str(e)}"
