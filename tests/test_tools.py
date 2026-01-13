"""Tests for the tools."""

import os
import tempfile
from pathlib import Path

import pytest

from src.core.tools.read_file import ReadFileTool
from src.core.tools.write_file import WriteFileTool
from src.core.tools.run_command import RunCommandTool
from src.core.tools.list_directory import ListDirectoryTool
from src.core.tools.search_code import SearchCodeTool


class TestReadFileTool:
    """Tests for ReadFileTool."""
    
    def test_read_existing_file(self, tmp_path):
        """Test reading an existing file."""
        tool = ReadFileTool()
        test_file = tmp_path / "test.txt"
        test_file.write_text("Hello, World!")
        
        result = tool.execute(path=str(test_file))
        
        assert result.success is True
        assert result.output == "Hello, World!"
        assert result.error is None
    
    def test_read_nonexistent_file(self):
        """Test reading a file that doesn't exist."""
        tool = ReadFileTool()
        
        result = tool.execute(path="/nonexistent/path/file.txt")
        
        assert result.success is False
        assert "not found" in result.error.lower()
    
    def test_read_directory(self, tmp_path):
        """Test that reading a directory fails."""
        tool = ReadFileTool()
        
        result = tool.execute(path=str(tmp_path))
        
        assert result.success is False
        assert "not a file" in result.error.lower()


class TestWriteFileTool:
    """Tests for WriteFileTool."""
    
    def test_write_file_no_confirmation(self, tmp_path):
        """Test writing without confirmation requirement."""
        tool = WriteFileTool(require_confirmation=False)
        test_file = tmp_path / "output.txt"
        
        result = tool.execute(path=str(test_file), content="Test content")
        
        assert result.success is True
        assert test_file.read_text() == "Test content"
    
    def test_write_file_with_confirmation(self, tmp_path):
        """Test writing with confirmation requirement."""
        tool = WriteFileTool(require_confirmation=True)
        test_file = tmp_path / "output.txt"
        
        result = tool.execute(path=str(test_file), content="Test content")
        
        assert result.success is True
        assert "PENDING" in result.output
        assert not test_file.exists()
        
        # Confirm the write
        confirm_result = tool.confirm_pending()
        assert confirm_result.success is True
        assert test_file.read_text() == "Test content"
    
    def test_write_creates_parent_dirs(self, tmp_path):
        """Test that writing creates parent directories."""
        tool = WriteFileTool(require_confirmation=False)
        test_file = tmp_path / "subdir" / "deep" / "output.txt"
        
        result = tool.execute(path=str(test_file), content="Nested content")
        
        assert result.success is True
        assert test_file.read_text() == "Nested content"


class TestRunCommandTool:
    """Tests for RunCommandTool."""
    
    def test_run_simple_command(self):
        """Test running a simple command."""
        tool = RunCommandTool()
        
        result = tool.execute(command="echo Hello")
        
        assert result.success is True
        assert "Hello" in result.output
    
    def test_run_failing_command(self):
        """Test running a command that fails."""
        tool = RunCommandTool()
        
        result = tool.execute(command="exit 1")
        
        assert result.success is False
        assert result.error is not None
    
    def test_run_command_with_cwd(self, tmp_path):
        """Test running a command with custom working directory."""
        tool = RunCommandTool()
        
        result = tool.execute(command="pwd", cwd=str(tmp_path))
        
        assert result.success is True
        assert str(tmp_path) in result.output


class TestListDirectoryTool:
    """Tests for ListDirectoryTool."""
    
    def test_list_directory(self, tmp_path):
        """Test listing a directory."""
        tool = ListDirectoryTool()
        (tmp_path / "file1.txt").touch()
        (tmp_path / "file2.py").touch()
        (tmp_path / "subdir").mkdir()
        
        result = tool.execute(path=str(tmp_path))
        
        assert result.success is True
        assert "file1.txt" in result.output
        assert "file2.py" in result.output
        assert "subdir" in result.output
    
    def test_list_empty_directory(self, tmp_path):
        """Test listing an empty directory."""
        tool = ListDirectoryTool()
        empty_dir = tmp_path / "empty"
        empty_dir.mkdir()
        
        result = tool.execute(path=str(empty_dir))
        
        assert result.success is True
        assert "empty" in result.output.lower()
    
    def test_list_nonexistent_directory(self):
        """Test listing a directory that doesn't exist."""
        tool = ListDirectoryTool()
        
        result = tool.execute(path="/nonexistent/path")
        
        assert result.success is False


class TestSearchCodeTool:
    """Tests for SearchCodeTool."""
    
    def test_search_finds_pattern(self, tmp_path):
        """Test searching for a pattern that exists."""
        tool = SearchCodeTool()
        test_file = tmp_path / "code.py"
        test_file.write_text("def hello():\n    print('world')\n")
        
        result = tool.execute(pattern="hello", path=str(tmp_path))
        
        assert result.success is True
        assert "hello" in result.output
        assert "code.py" in result.output
    
    def test_search_no_matches(self, tmp_path):
        """Test searching for a pattern that doesn't exist."""
        tool = SearchCodeTool()
        test_file = tmp_path / "code.py"
        test_file.write_text("def foo():\n    pass\n")
        
        result = tool.execute(pattern="nonexistent", path=str(tmp_path))
        
        assert result.success is True
        assert "no matches" in result.output.lower()
    
    def test_search_with_file_pattern(self, tmp_path):
        """Test searching with a specific file pattern."""
        tool = SearchCodeTool()
        (tmp_path / "file.py").write_text("target")
        (tmp_path / "file.txt").write_text("target")
        
        result = tool.execute(pattern="target", path=str(tmp_path), file_pattern="*.py")
        
        assert result.success is True
        assert "file.py" in result.output
