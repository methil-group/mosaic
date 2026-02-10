use std::fs;
use std::path::PathBuf;

pub struct FileSystemService;

impl FileSystemService {
    pub fn list_directories(path: &str) -> Result<Vec<String>, String> {
        let entries = fs::read_dir(path).map_err(|e| e.to_string())?;
        let mut dirs = Vec::new();
        for entry in entries {
            let entry = entry.map_err(|e| e.to_string())?;
            if entry.file_type().map_err(|e| e.to_string())?.is_dir() {
                dirs.push(entry.file_name().to_string_lossy().to_string());
            }
        }
        Ok(dirs)
    }

    pub fn list_files(path: &str) -> Result<Vec<String>, String> {
        let entries = fs::read_dir(path).map_err(|e| e.to_string())?;
        let mut files = Vec::new();
        for entry in entries {
            let entry = entry.map_err(|e| e.to_string())?;
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
