// IndexedDB helper for persisting FileSystem handles, app state and cached posts
import type { MarkdownFile } from '@/types';

const DB_NAME = 'mdplusplus-db';
const DB_VERSION = 2; // bump for posts cache store
const HANDLE_STORE = 'directory-handles';
const STATE_STORE = 'app-state';
const POSTS_STORE = 'posts-cache';

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

// Clear all persisted data
export async function clearPersistedData(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([HANDLE_STORE, STATE_STORE, POSTS_STORE], 'readwrite');
    
    transaction.objectStore(HANDLE_STORE).clear();
    transaction.objectStore(STATE_STORE).clear();
    transaction.objectStore(POSTS_STORE).clear();
    
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

