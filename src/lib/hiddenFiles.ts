// Manage hidden files list

const STORAGE_KEY = 'mdplusplus-hidden-files';

interface HiddenFilesData {
  [directoryPath: string]: string[]; // directory path -> array of file paths
}

// Get all hidden files data
function getHiddenFilesData(): HiddenFilesData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    // Failed to load hidden files
    return {};
  }
}

// Save hidden files data
function saveHiddenFilesData(data: HiddenFilesData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    // Failed to save hidden files
  }
}

// Get hidden files for a specific directory
export function getHiddenFiles(directoryPath: string): string[] {
  const data = getHiddenFilesData();
  return data[directoryPath] || [];
}

// Hide a file
export function hideFile(directoryPath: string, filePath: string): void {
  const data = getHiddenFilesData();
  
  if (!data[directoryPath]) {
    data[directoryPath] = [];
  }
  
  if (!data[directoryPath].includes(filePath)) {
    data[directoryPath].push(filePath);
    saveHiddenFilesData(data);
  }
}

// Unhide a file
export function unhideFile(directoryPath: string, filePath: string): void {
  const data = getHiddenFilesData();
  
  if (data[directoryPath]) {
    data[directoryPath] = data[directoryPath].filter(path => path !== filePath);
    
    // Clean up empty directory entries
    if (data[directoryPath].length === 0) {
      delete data[directoryPath];
    }
    
    saveHiddenFilesData(data);
  }
}

// Check if a file is hidden
export function isFileHidden(directoryPath: string, filePath: string): boolean {
  const hiddenFiles = getHiddenFiles(directoryPath);
  return hiddenFiles.includes(filePath);
}

// Clear all hidden files for a directory
export function clearHiddenFiles(directoryPath: string): void {
  const data = getHiddenFilesData();
  delete data[directoryPath];
  saveHiddenFilesData(data);
}

// Clear all hidden files (for all directories)
export function clearAllHiddenFiles(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    // Failed to clear hidden files
  }
}

