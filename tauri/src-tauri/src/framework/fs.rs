use std::fs;
use std::path::{Path, PathBuf};

#[cfg(windows)]
use std::os::windows::fs::MetadataExt;

pub struct FileSystemService;

impl FileSystemService {
    pub fn is_hidden(path: &Path) -> bool {
        let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
        
        // macOS/Linux: files starting with "." are hidden
        if name.starts_with('.') {
            return true;
        }

        #[cfg(windows)]
        {
            if let Ok(metadata) = fs::metadata(path) {
                let attributes = metadata.file_attributes();
                // 0x2 is the hidden attribute on Windows
                return (attributes & 0x2) != 0;
            }
        }

        false
    }

    pub fn list_directories(path: &str, show_hidden: bool) -> Result<Vec<String>, String> {
        let entries = fs::read_dir(path).map_err(|e| e.to_string())?;
        let mut dirs = Vec::new();
        for entry in entries {
            let entry = entry.map_err(|e| e.to_string())?;
            let entry_path = entry.path();
            
            if !show_hidden && Self::is_hidden(&entry_path) {
                continue;
            }

            if entry.file_type().map_err(|e| e.to_string())?.is_dir() {
                dirs.push(entry.file_name().to_string_lossy().to_string());
            }
        }
        Ok(dirs)
    }

    pub fn list_files(path: &str, show_hidden: bool) -> Result<Vec<String>, String> {
        let entries = fs::read_dir(path).map_err(|e| e.to_string())?;
        let mut files = Vec::new();
        for entry in entries {
            let entry = entry.map_err(|e| e.to_string())?;
            let entry_path = entry.path();

            if !show_hidden && Self::is_hidden(&entry_path) {
                continue;
            }

            if entry.file_type().map_err(|e| e.to_string())?.is_file() {
                files.push(entry.file_name().to_string_lossy().to_string());
            }
        }
        Ok(files)
    }

    pub fn create_directory(path: &str, name: &str) -> Result<(), String> {
        let full_path = PathBuf::from(path).join(name);
        fs::create_dir_all(full_path).map_err(|e| e.to_string())?;
        Ok(())
    }
}

