import type { MarkdownFile, FileTreeItem } from '@/types';
import { readDirectory, readFile } from '@/lib/fileSystem';
import { parseMarkdown } from '@/lib/markdown';
import { savePostsCache, loadPostsCache } from '@/lib/persistedState';

interface PostsState {
  projectKey: string | null;
  posts: MarkdownFile[];
  isLoading: boolean;
  fileTree: FileTreeItem[];
  isLoadingTree: boolean;
}

type Listener = (state: PostsState) => void;

let state: PostsState = {
  projectKey: null,
  posts: [],
  isLoading: false,
  fileTree: [],
  isLoadingTree: false,
};

const listeners = new Set<Listener>();
let inFlightScan: Promise<void> | null = null;

function notify(): void {
  listeners.forEach((fn) => fn(state));
}

export function subscribePosts(listener: Listener): () => void {
  listeners.add(listener);
  // Emit current state immediately
  listener(state);
  return () => listeners.delete(listener);
}

export function getPostsState(): PostsState {
  return state;
}

export async function initializePosts(handle: FileSystemDirectoryHandle): Promise<void> {
  const projectKey = handle.name;
  // Switch project if needed
  if (state.projectKey !== projectKey) {
    state = { projectKey, posts: [], isLoading: false, fileTree: [], isLoadingTree: false };
    notify();
  }

  // Try cache first (non-blocking UI)
  try {
    const cached = await loadPostsCache(projectKey);
    if (cached && cached.length > 0) {
      state = { ...state, posts: cached, isLoading: false };
      notify();
    } else {
      state = { ...state, posts: [], isLoading: true };
      notify();
    }
  } catch {
    state = { ...state, isLoading: true };
    notify();
  }

  // Kick off scan (serialized)
  await refreshPosts(handle);
}

export async function refreshPosts(handle: FileSystemDirectoryHandle, fileTree?: FileTreeItem[]): Promise<void> {
  const projectKey = handle.name;
  if (state.projectKey !== projectKey) {
    state = { projectKey, posts: [], isLoading: true, fileTree: [], isLoadingTree: true };
    notify();
  } else if (state.posts.length === 0) {
    // Only show loading if we don't already have posts (cache miss)
    state = { ...state, isLoading: true };
    notify();
  }

  if (inFlightScan) return inFlightScan;

  inFlightScan = (async () => {
    try {
      const tree = fileTree || (await readDirectory(handle));
      state = { ...state, fileTree: tree, isLoadingTree: false };
      notify();
      // Flatten file tree to a list of files
      const files: { path: string; name: string }[] = [];
      const collectFiles = (items: FileTreeItem[]) => {
        for (const item of items) {
          if (item.isDirectory && item.children) {
            collectFiles(item.children);
          } else if (!item.isDirectory) {
            files.push({ path: item.path, name: item.name });
          }
        }
      };
      collectFiles(tree);

      // Read and parse files concurrently
      const results = await Promise.all(
        files.map(async (f) => {
          try {
            const content = await readFile(handle, f.path);
            return parseMarkdown(content, f.path, f.name);
          } catch {
            return null; // skip unreadable files
          }
        })
      );

      const loaded = results.filter((p): p is MarkdownFile => p !== null);
      state = { ...state, posts: loaded, isLoading: false };
      notify();

      // Persist to cache
      await savePostsCache(projectKey, loaded);
    } finally {
      inFlightScan = null;
    }
  })();

  await inFlightScan;
}

export async function refreshFileTree(handle: FileSystemDirectoryHandle): Promise<FileTreeItem[]> {
  const projectKey = handle.name;
  if (state.projectKey !== projectKey) {
    state = { projectKey, posts: [], isLoading: true, fileTree: [], isLoadingTree: true };
    notify();
  } else {
    state = { ...state, isLoadingTree: true };
    notify();
  }

  const tree = await readDirectory(handle);
  state = { ...state, fileTree: tree, isLoadingTree: false };
  notify();
  return tree;
}

export async function applyPostAdded(projectKey: string, post: MarkdownFile): Promise<void> {
  if (state.projectKey !== projectKey) return;
  const next = [...state.posts, post];
  state = { ...state, posts: next };
  notify();
  try { await savePostsCache(projectKey, next); } catch {}
}

export async function applyPostUpdated(projectKey: string, updated: MarkdownFile): Promise<void> {
  if (state.projectKey !== projectKey) return;
  const next = state.posts.map((p) => (p.path === updated.path ? updated : p));
  state = { ...state, posts: next };
  notify();
  try { await savePostsCache(projectKey, next); } catch {}
}

export async function applyPostDeleted(projectKey: string, path: string): Promise<void> {
  if (state.projectKey !== projectKey) return;
  const next = state.posts.filter((p) => p.path !== path);
  state = { ...state, posts: next };
  notify();
  try { await savePostsCache(projectKey, next); } catch {}
}

export async function applyPostPathChanged(projectKey: string, oldPath: string, newPath: string): Promise<void> {
  if (state.projectKey !== projectKey) return;
  const next = state.posts.map((p) => (p.path === oldPath ? { ...p, path: newPath } : p));
  state = { ...state, posts: next };
  notify();
  try { await savePostsCache(projectKey, next); } catch {}
}


