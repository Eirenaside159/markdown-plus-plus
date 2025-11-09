// IndexedDB helper for persisting FileSystem handles, app state and cached posts & file tree
import type { MarkdownFile, FileTreeItem } from '@/types';

const DB_NAME = 'mdplusplus-db';
const DB_VERSION = 3; // bump for file tree cache store
const HANDLE_STORE = 'directory-handles';
const STATE_STORE = 'app-state';
const POSTS_STORE = 'posts-cache';
const FILETREE_STORE = 'filetree-cache';

interface AppState {
  selectedFilePath: string | null;
  viewMode: 'table' | 'editor' | 'settings';
  lastUpdate: number;
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
    console.error('Failed to save directory handle:', error);
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
          console.warn('Failed to verify permission:', error);
          resolve(null);
        }
      };
      
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Failed to load directory handle:', error);
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
    console.error('Failed to save app state:', error);
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
    console.error('Failed to load app state:', error);
    return null;
  }
}

// Clear all persisted data (including recent folders)
export async function clearPersistedData(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([HANDLE_STORE, STATE_STORE, POSTS_STORE, FILETREE_STORE], 'readwrite');
    
    transaction.objectStore(HANDLE_STORE).clear();
    transaction.objectStore(STATE_STORE).clear();
    transaction.objectStore(POSTS_STORE).clear();
    transaction.objectStore(FILETREE_STORE).clear();
    
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
    console.error('Failed to clear persisted data:', error);
  }
}

// Clear current workspace only (keeps recent folders)
export async function clearCurrentWorkspace(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([HANDLE_STORE, STATE_STORE, POSTS_STORE, FILETREE_STORE], 'readwrite');
    
    // Only delete current-directory, keep recent-* handles
    transaction.objectStore(HANDLE_STORE).delete('current-directory');
    transaction.objectStore(STATE_STORE).clear();
    transaction.objectStore(POSTS_STORE).clear();
    transaction.objectStore(FILETREE_STORE).clear();
    
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
    console.error('Failed to clear current workspace:', error);
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
        console.log('[ClearRecentHandles] All recent folder handles cleared');
        db.close();
        resolve();
      };
      
      transaction.onerror = () => {
        console.error('[ClearRecentHandles] Transaction error:', transaction.error);
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('[ClearRecentHandles] Failed to clear recent folder handles:', error);
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

// Save recent folder handle
export async function saveRecentFolderHandle(folderName: string, handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    console.log('[SaveRecentFolder] Saving handle for:', folderName, 'with key:', `recent-${folderName}`);
    console.log('[SaveRecentFolder] Handle type:', handle.kind, 'name:', handle.name);
    
    const db = await openDB();
    const transaction = db.transaction([HANDLE_STORE], 'readwrite');
    const store = transaction.objectStore(HANDLE_STORE);
    
    const putRequest = store.put(handle, `recent-${folderName}`);
    
    return new Promise((resolve, reject) => {
      putRequest.onsuccess = () => {
        console.log('[SaveRecentFolder] Put request successful for:', folderName);
      };
      
      putRequest.onerror = () => {
        console.error('[SaveRecentFolder] Put request error for:', folderName, putRequest.error);
        reject(putRequest.error);
      };
      
      transaction.oncomplete = async () => {
        console.log('[SaveRecentFolder] Transaction complete for:', folderName);
        
        // Verify the save by reading it back immediately
        try {
          const verifyDb = await openDB();
          const verifyTx = verifyDb.transaction([HANDLE_STORE], 'readonly');
          const verifyStore = verifyTx.objectStore(HANDLE_STORE);
          const verifyRequest = verifyStore.get(`recent-${folderName}`);
          
          verifyRequest.onsuccess = () => {
            const savedHandle = verifyRequest.result;
            console.log('[SaveRecentFolder] Verification:', folderName, savedHandle ? 'VERIFIED ✓' : 'FAILED ✗');
            if (!savedHandle) {
              console.error('[SaveRecentFolder] Handle was not saved to IndexedDB!');
            }
            verifyDb.close();
          };
          
          verifyRequest.onerror = () => {
            console.error('[SaveRecentFolder] Verification error:', verifyRequest.error);
            verifyDb.close();
          };
        } catch (verifyError) {
          console.error('[SaveRecentFolder] Verification failed:', verifyError);
        }
        
        // Small delay to ensure DB has flushed to disk
        setTimeout(() => {
          db.close();
          console.log('[SaveRecentFolder] DB closed for:', folderName);
          resolve();
        }, 50);
      };
      
      transaction.onerror = () => {
        console.error('[SaveRecentFolder] Transaction error for:', folderName, transaction.error);
        db.close();
        reject(transaction.error);
      };
      
      transaction.onabort = () => {
        console.error('[SaveRecentFolder] Transaction aborted for:', folderName);
        db.close();
        reject(new Error('Transaction aborted'));
      };
    });
  } catch (error) {
    console.error('[SaveRecentFolder] Failed to save recent folder handle for:', folderName, error);
    throw error;
  }
}

// Load recent folder handle
export async function loadRecentFolderHandle(folderName: string): Promise<FileSystemDirectoryHandle | null> {
  try {
    console.log('[LoadRecentFolder] Loading handle for:', folderName, 'with key:', `recent-${folderName}`);
    const db = await openDB();
    const transaction = db.transaction([HANDLE_STORE], 'readonly');
    const store = transaction.objectStore(HANDLE_STORE);
    
    // First, list all keys in the store for debugging
    const getAllKeysRequest = store.getAllKeys();
    getAllKeysRequest.onsuccess = () => {
      console.log('[LoadRecentFolder] All keys in handle store:', getAllKeysRequest.result);
    };
    
    return new Promise((resolve, reject) => {
      const request = store.get(`recent-${folderName}`);
      
      request.onsuccess = async () => {
        const handle = request.result as FileSystemDirectoryHandle | undefined;
        
        console.log('[LoadRecentFolder] Get request result for:', folderName, handle ? 'FOUND' : 'NOT FOUND');
        
        if (!handle) {
          console.warn('[LoadRecentFolder] No handle found for:', folderName);
          db.close();
          resolve(null);
          return;
        }

        console.log('[LoadRecentFolder] Handle found for:', folderName, 'Verifying permission...');
        
        // Verify permission
        try {
          const permission = await handle.queryPermission({ mode: 'readwrite' });
          console.log('[LoadRecentFolder] Current permission for', folderName, ':', permission);
          
          if (permission === 'granted') {
            console.log('[LoadRecentFolder] Permission granted for:', folderName);
            db.close();
            resolve(handle);
          } else {
            // Try to request permission
            console.log('[LoadRecentFolder] Requesting permission for:', folderName);
            const requestedPermission = await handle.requestPermission({ mode: 'readwrite' });
            console.log('[LoadRecentFolder] Requested permission result for', folderName, ':', requestedPermission);
            
            if (requestedPermission === 'granted') {
              db.close();
              resolve(handle);
            } else {
              console.warn('[LoadRecentFolder] Permission denied for:', folderName);
              db.close();
              resolve(null);
            }
          }
        } catch (error) {
          // Handle might be invalid
          console.warn('[LoadRecentFolder] Failed to verify permission for:', folderName, error);
          db.close();
          resolve(null);
        }
      };
      
      request.onerror = () => {
        console.error('[LoadRecentFolder] Request error for:', folderName, request.error);
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[LoadRecentFolder] Failed to load recent folder handle for:', folderName, error);
    return null;
  }
}

