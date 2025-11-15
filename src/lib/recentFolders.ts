export type RecentItemType = 'folder' | 'file' | 'remote';

export interface RecentItem {
  type: RecentItemType;
  name: string;
  timestamp: number;
  // For remote repositories
  remote?: {
    provider: 'github' | 'gitlab';
    fullName: string;
    owner: string;
    branch: string;
    repoId: string;
    defaultBranch: string;
    url: string;
  };
}

const RECENT_ITEMS_KEY = 'mdplusplus_recent_items';
const RECENT_FOLDERS_KEY = 'mdplusplus_recent_folders'; // Keep for migration
const MAX_RECENT_ITEMS = 10;

/**
 * Migrate old recent folders to new format
 */
function migrateOldRecentFolders(): void {
  try {
    const oldStored = localStorage.getItem(RECENT_FOLDERS_KEY);
    if (!oldStored) return;
    
    const oldFolders = JSON.parse(oldStored) as Array<{ name: string; timestamp: number }>;
    const migratedItems: RecentItem[] = oldFolders.map(folder => ({
      type: 'folder' as const,
      name: folder.name,
      timestamp: folder.timestamp,
    }));
    
    localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(migratedItems));
    localStorage.removeItem(RECENT_FOLDERS_KEY);
  } catch (error) {
    console.error('Failed to migrate recent folders:', error);
  }
}

/**
 * Get list of recent items (folders, files, and remote repositories)
 */
export function getRecentItems(): RecentItem[] {
  try {
    // Try to migrate old format
    const oldStored = localStorage.getItem(RECENT_FOLDERS_KEY);
    if (oldStored) {
      migrateOldRecentFolders();
    }
    
    const stored = localStorage.getItem(RECENT_ITEMS_KEY);
    if (!stored) return [];
    
    const items = JSON.parse(stored) as RecentItem[];
    return items.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    return [];
  }
}

/**
 * Add a folder to recent items list
 */
export function addRecentFolder(handle: FileSystemDirectoryHandle): void {
  try {
    const items = getRecentItems();
    
    // Remove if already exists (same type and name)
    const filtered = items.filter(item => !(item.type === 'folder' && item.name === handle.name));
    
    // Add to beginning
    const newItem: RecentItem = {
      type: 'folder',
      name: handle.name,
      timestamp: Date.now(),
    };
    
    const updated = [newItem, ...filtered].slice(0, MAX_RECENT_ITEMS);
    
    localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to add recent folder:', error);
  }
}

/**
 * Add a file to recent items list
 */
export function addRecentFile(handle: FileSystemFileHandle): void {
  try {
    const items = getRecentItems();
    
    // Remove if already exists (same type and name)
    const filtered = items.filter(item => !(item.type === 'file' && item.name === handle.name));
    
    // Add to beginning
    const newItem: RecentItem = {
      type: 'file',
      name: handle.name,
      timestamp: Date.now(),
    };
    
    const updated = [newItem, ...filtered].slice(0, MAX_RECENT_ITEMS);
    
    localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to add recent file:', error);
  }
}

/**
 * Add a remote repository to recent items list
 */
export function addRecentRemote(
  provider: 'github' | 'gitlab',
  repository: {
    id: string;
    name: string;
    fullName: string;
    owner: string;
    branch: string;
    defaultBranch: string;
    url: string;
  }
): void {
  try {
    const items = getRecentItems();
    
    // Remove if already exists (same provider, owner, name, and branch)
    const filtered = items.filter(item => {
      if (item.type !== 'remote' || !item.remote) return true;
      return !(
        item.remote.provider === provider &&
        item.remote.fullName === repository.fullName &&
        item.remote.branch === repository.branch
      );
    });
    
    // Add to beginning
    const newItem: RecentItem = {
      type: 'remote',
      name: repository.name,
      timestamp: Date.now(),
      remote: {
        provider,
        fullName: repository.fullName,
        owner: repository.owner,
        branch: repository.branch,
        repoId: repository.id,
        defaultBranch: repository.defaultBranch,
        url: repository.url,
      },
    };
    
    const updated = [newItem, ...filtered].slice(0, MAX_RECENT_ITEMS);
    
    localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to add recent remote:', error);
  }
}

/**
 * Clear all recent items
 */
export function clearRecentItems(): void {
  try {
    localStorage.removeItem(RECENT_ITEMS_KEY);
  } catch (error) {
    console.error('Failed to clear recent items:', error);
  }
}

// Keep old function names for backward compatibility
export const getRecentFolders = getRecentItems;
export const clearRecentFolders = clearRecentItems;

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

