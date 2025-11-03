interface RecentFolder {
  name: string;
  timestamp: number;
}

const RECENT_FOLDERS_KEY = 'mdplusplus_recent_folders';
const MAX_RECENT_FOLDERS = 8;

/**
 * Get list of recently opened folders
 */
export function getRecentFolders(): RecentFolder[] {
  try {
    const stored = localStorage.getItem(RECENT_FOLDERS_KEY);
    if (!stored) return [];
    
    const folders = JSON.parse(stored) as RecentFolder[];
    return folders.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    return [];
  }
}

/**
 * Add a folder to recent folders list
 */
export function addRecentFolder(handle: FileSystemDirectoryHandle): void {
  try {
    const folders = getRecentFolders();
    
    // Remove if already exists
    const filtered = folders.filter(f => f.name !== handle.name);
    
    // Add to beginning
    const newFolder: RecentFolder = {
      name: handle.name,
      timestamp: Date.now(),
    };
    
    const updated = [newFolder, ...filtered].slice(0, MAX_RECENT_FOLDERS);
    
    localStorage.setItem(RECENT_FOLDERS_KEY, JSON.stringify(updated));
  } catch (error) {
    // Silently handle error
  }
}

/**
 * Clear all recent folders
 */
export function clearRecentFolders(): void {
  try {
    localStorage.removeItem(RECENT_FOLDERS_KEY);
  } catch (error) {
    // Silently handle error
  }
}

/**
 * Format timestamp to readable date
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

