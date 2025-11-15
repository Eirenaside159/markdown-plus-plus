// IndexedDB helper for persisting FileSystem handles, app state and cached posts & file tree
import type { MarkdownFile, FileTreeItem } from '@/types';

const DB_NAME = 'mdplusplus-db';
const DB_VERSION = 4; // bump for metadata cache store
const HANDLE_STORE = 'directory-handles';
const STATE_STORE = 'app-state';
const POSTS_STORE = 'posts-cache';
const FILETREE_STORE = 'filetree-cache';
const METADATA_STORE = 'metadata-cache';

interface AppState {
  selectedFilePath: string | null;
  viewMode: 'table' | 'editor' | 'settings';
  lastUpdate: number;
  // Remote workspace state
  workspaceType?: 'local' | 'remote';
  remoteProvider?: 'github' | 'gitlab';
  remoteToken?: string;
  remoteRepo?: {
    id: string;
    name: string;
    fullName: string;
    owner?: string;
    branch: string;
    defaultBranch: string;
    url: string;
  };
}

// Open IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create stores if they don't exist
      if (!db.objectStoreNames.contains(HANDLE_STORE)) {
        db.createObjectStore(HANDLE_STORE);
      }
      if (!db.objectStoreNames.contains(STATE_STORE)) {
        db.createObjectStore(STATE_STORE);
      }
      if (!db.objectStoreNames.contains(POSTS_STORE)) {
        db.createObjectStore(POSTS_STORE);
      }
      if (!db.objectStoreNames.contains(FILETREE_STORE)) {
        db.createObjectStore(FILETREE_STORE);
      }
      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        db.createObjectStore(METADATA_STORE);
      }
    };
  });
}

// Save directory handle
export async function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([HANDLE_STORE], 'readwrite');
    const store = transaction.objectStore(HANDLE_STORE);
    
    store.put(handle, 'current-directory');
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    // Failed to save directory handle
  }
}

// Load directory handle
export async function loadDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction([HANDLE_STORE], 'readonly');
    const store = transaction.objectStore(HANDLE_STORE);
    
    return new Promise((resolve, reject) => {
      const request = store.get('current-directory');
      
      request.onsuccess = async () => {
        db.close();
        const handle = request.result as FileSystemDirectoryHandle | undefined;
        
        if (!handle) {
          resolve(null);
          return;
        }

        // Verify permission
        try {
          const permission = await handle.queryPermission({ mode: 'readwrite' });
          if (permission === 'granted') {
            resolve(handle);
          } else {
            // Try to request permission
            const requestedPermission = await handle.requestPermission({ mode: 'readwrite' });
            if (requestedPermission === 'granted') {
              resolve(handle);
            } else {
              resolve(null);
            }
          }
        } catch (error) {
          // Handle might be invalid
          resolve(null);
        }
      };
      
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    return null;
  }
}

// Save app state
export async function saveAppState(state: Partial<AppState>): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STATE_STORE], 'readwrite');
    const store = transaction.objectStore(STATE_STORE);
    
    // Get existing state
    const getRequest = store.get('app-state');
    
    getRequest.onsuccess = () => {
      const existingState = (getRequest.result || {}) as AppState;
      const newState: AppState = {
        ...existingState,
        ...state,
        lastUpdate: Date.now(),
      };
      
      store.put(newState, 'app-state');
    };
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    // Failed to save app state
  }
}

// Load app state
export async function loadAppState(): Promise<AppState | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STATE_STORE], 'readonly');
    const store = transaction.objectStore(STATE_STORE);
    
    return new Promise((resolve, reject) => {
      const request = store.get('app-state');
      
      request.onsuccess = () => {
        db.close();
        const state = request.result as AppState | undefined;
        
        // Check if state is recent (less than 7 days old)
        if (state && state.lastUpdate) {
          const daysSinceUpdate = (Date.now() - state.lastUpdate) / (1000 * 60 * 60 * 24);
          if (daysSinceUpdate < 7) {
            resolve(state);
            return;
          }
        }
        
        resolve(null);
      };
      
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    return null;
  }
}

// Clear all persisted data (including recent folders)
export async function clearPersistedData(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(
      [HANDLE_STORE, STATE_STORE, POSTS_STORE, FILETREE_STORE, METADATA_STORE],
      'readwrite'
    );
    
    transaction.objectStore(HANDLE_STORE).clear();
    transaction.objectStore(STATE_STORE).clear();
    transaction.objectStore(POSTS_STORE).clear();
    transaction.objectStore(FILETREE_STORE).clear();
    transaction.objectStore(METADATA_STORE).clear();
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    // Failed to clear persisted data
  }
}

// Clear current workspace only (keeps recent folders)
export async function clearCurrentWorkspace(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(
      [HANDLE_STORE, STATE_STORE, POSTS_STORE, FILETREE_STORE, METADATA_STORE],
      'readwrite'
    );
    
    // Only delete current-directory and current-single-file, keep recent-* handles
    transaction.objectStore(HANDLE_STORE).delete('current-directory');
    transaction.objectStore(HANDLE_STORE).delete('current-single-file');
    transaction.objectStore(STATE_STORE).clear();
    transaction.objectStore(POSTS_STORE).clear();
    transaction.objectStore(FILETREE_STORE).clear();
    transaction.objectStore(METADATA_STORE).clear();
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    // Failed to clear current workspace
  }
}

// Clear all recent folder handles
export async function clearAllRecentFolderHandles(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([HANDLE_STORE], 'readwrite');
    const store = transaction.objectStore(HANDLE_STORE);
    
    // Get all keys
    const getAllKeysRequest = store.getAllKeys();
    
    return new Promise((resolve, reject) => {
      getAllKeysRequest.onsuccess = () => {
        const keys = getAllKeysRequest.result as string[];
        // Delete only recent-* keys
        keys.forEach(key => {
          if (key.startsWith('recent-')) {
            store.delete(key);
          }
        });
      };
      
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    // Failed to clear recent folder handles
  }
}

// Normalize MarkdownFile for caching (convert Date to ISO string)
function normalizePostForCache(post: MarkdownFile): MarkdownFile {
  const normalizedFrontmatter: MarkdownFile['frontmatter'] = { ...post.frontmatter };
  const date = normalizedFrontmatter.date;
  if (date instanceof Date) {
    normalizedFrontmatter.date = date.toISOString();
  }
  return {
    ...post,
    frontmatter: normalizedFrontmatter,
  };
}

// Save posts list to cache for a project (keyed by directory name)
export async function savePostsCache(projectKey: string, posts: MarkdownFile[]): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([POSTS_STORE], 'readwrite');
    const store = transaction.objectStore(POSTS_STORE);
    const normalized = posts.map(normalizePostForCache);
    store.put({ posts: normalized, updatedAt: Date.now() }, projectKey);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    // Silently ignore cache errors
  }
}

// Load cached posts for a project (keyed by directory name)
export async function loadPostsCache(projectKey: string): Promise<MarkdownFile[] | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction([POSTS_STORE], 'readonly');
    const store = transaction.objectStore(POSTS_STORE);
    return await new Promise<MarkdownFile[] | null>((resolve, reject) => {
      const request = store.get(projectKey);
      request.onsuccess = () => {
        db.close();
        const result = request.result as { posts: MarkdownFile[]; updatedAt: number } | undefined;
        if (!result) return resolve(null);
        resolve(result.posts);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch {
    return null;
  }
}

// Clear cached posts for a project
export async function clearPostsCache(projectKey: string): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([POSTS_STORE], 'readwrite');
    const store = transaction.objectStore(POSTS_STORE);
    store.delete(projectKey);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    // Silently ignore
  }
}

// Save file tree to cache for a project (keyed by directory name)
export async function saveFileTreeCache(projectKey: string, tree: FileTreeItem[]): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([FILETREE_STORE], 'readwrite');
    const store = transaction.objectStore(FILETREE_STORE);
    store.put({ tree, updatedAt: Date.now() }, projectKey);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch {}
}

// Load cached file tree for a project
export async function loadFileTreeCache(projectKey: string): Promise<FileTreeItem[] | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction([FILETREE_STORE], 'readonly');
    const store = transaction.objectStore(FILETREE_STORE);
    return await new Promise<FileTreeItem[] | null>((resolve, reject) => {
      const request = store.get(projectKey);
      request.onsuccess = () => {
        db.close();
        const result = request.result as { tree: FileTreeItem[]; updatedAt: number } | undefined;
        if (!result) return resolve(null);
        resolve(result.tree);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch {
    return null;
  }
}

export type RemoteMetadataCache = Record<string, { sha?: string; lastFetched: number }>;

export async function saveRemoteMetadataCache(
  projectKey: string,
  metadata: RemoteMetadataCache
): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([METADATA_STORE], 'readwrite');
    const store = transaction.objectStore(METADATA_STORE);
    store.put({ metadata, updatedAt: Date.now() }, projectKey);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch {
    // Ignore metadata cache errors
  }
}

export async function loadRemoteMetadataCache(
  projectKey: string
): Promise<RemoteMetadataCache | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction([METADATA_STORE], 'readonly');
    const store = transaction.objectStore(METADATA_STORE);
    return await new Promise<RemoteMetadataCache | null>((resolve, reject) => {
      const request = store.get(projectKey);
      request.onsuccess = () => {
        db.close();
        const result = request.result as { metadata: RemoteMetadataCache } | undefined;
        if (!result) return resolve(null);
        resolve(result.metadata);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch {
    return null;
  }
}

// Save recent folder handle
export async function saveRecentFolderHandle(folderName: string, handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([HANDLE_STORE], 'readwrite');
    const store = transaction.objectStore(HANDLE_STORE);
    
    const putRequest = store.put(handle, `recent-${folderName}`);
    
    return new Promise((resolve, reject) => {
      putRequest.onerror = () => {
        reject(putRequest.error);
      };
      
      transaction.oncomplete = () => {
        // Small delay to ensure DB has flushed to disk
        setTimeout(() => {
          db.close();
          resolve();
        }, 50);
      };
      
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
      
      transaction.onabort = () => {
        db.close();
        reject(new Error('Transaction aborted'));
      };
    });
  } catch (error) {
    throw error;
  }
}

// Load recent folder handle
export async function loadRecentFolderHandle(folderName: string): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction([HANDLE_STORE], 'readonly');
    const store = transaction.objectStore(HANDLE_STORE);
    
    return new Promise((resolve, reject) => {
      const request = store.get(`recent-${folderName}`);
      
      request.onsuccess = async () => {
        const handle = request.result as FileSystemDirectoryHandle | undefined;
        
        if (!handle) {
          db.close();
          resolve(null);
          return;
        }
        
        // Verify permission
        try {
          const permission = await handle.queryPermission({ mode: 'readwrite' });
          
          if (permission === 'granted') {
            db.close();
            resolve(handle);
          } else {
            // Try to request permission
            const requestedPermission = await handle.requestPermission({ mode: 'readwrite' });
            
            if (requestedPermission === 'granted') {
              db.close();
              resolve(handle);
            } else {
              db.close();
              resolve(null);
            }
          }
        } catch (error) {
          // Handle might be invalid
          db.close();
          resolve(null);
        }
      };
      
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    return null;
  }
}

// Save single file handle
export async function saveSingleFileHandle(handle: FileSystemFileHandle): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([HANDLE_STORE], 'readwrite');
    const store = transaction.objectStore(HANDLE_STORE);
    
    store.put(handle, 'current-single-file');
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    // Failed to save single file handle
  }
}

// Load single file handle
export async function loadSingleFileHandle(): Promise<FileSystemFileHandle | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction([HANDLE_STORE], 'readonly');
    const store = transaction.objectStore(HANDLE_STORE);
    
    return new Promise((resolve, reject) => {
      const request = store.get('current-single-file');
      
      request.onsuccess = async () => {
        db.close();
        const handle = request.result as FileSystemFileHandle | undefined;
        
        if (!handle) {
          resolve(null);
          return;
        }

        // Verify permission
        try {
          const permission = await handle.queryPermission({ mode: 'readwrite' });
          if (permission === 'granted') {
            resolve(handle);
          } else {
            // Try to request permission
            const requestedPermission = await handle.requestPermission({ mode: 'readwrite' });
            if (requestedPermission === 'granted') {
              resolve(handle);
            } else {
              resolve(null);
            }
          }
        } catch (error) {
          // Handle might be invalid
          resolve(null);
        }
      };
      
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    return null;
  }
}

// Clear single file handle
export async function clearSingleFileHandle(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([HANDLE_STORE], 'readwrite');
    const store = transaction.objectStore(HANDLE_STORE);
    
    store.delete('current-single-file');
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    // Failed to clear single file handle
  }
}

