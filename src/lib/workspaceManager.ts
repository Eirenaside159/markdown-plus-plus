import type { Workspace, MarkdownFile, FileTreeItem, RemoteWorkspace } from '@/types';
import { 
  fetchRemoteFiles, 
  parseRemoteMarkdownFile, 
  saveRemoteFile, 
  deleteRemoteFile,
  renameRemoteFile,
  updateFileMetadata,
} from './remoteWorkspace';
import { generateCommitMessage } from './gitOperations';
import {
  loadPostsCache,
  savePostsCache,
  loadFileTreeCache,
  saveFileTreeCache,
  loadRemoteMetadataCache,
  saveRemoteMetadataCache,
  type RemoteMetadataCache,
} from './persistedState';

interface WorkspaceState {
  workspace: Workspace | null;
  posts: MarkdownFile[];
  fileTree: FileTreeItem[];
  isLoading: boolean;
}

interface ConnectRemoteOptions {
  autoRefresh?: boolean;
  hasCachedData?: boolean;
}

type Listener = (state: WorkspaceState) => void;

let state: WorkspaceState = {
  workspace: null,
  posts: [],
  fileTree: [],
  isLoading: false,
};

const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach((fn) => fn(state));
}

function getRemoteCacheKey(remote: RemoteWorkspace): string {
  const { provider, repository } = remote;
  return `remote:${provider}:${repository.id}:${repository.branch}`;
}

function isActiveRemote(remote: RemoteWorkspace): boolean {
  const current = state.workspace?.remote;
  if (!current) return false;
  return getRemoteCacheKey(current) === getRemoteCacheKey(remote);
}

async function hydrateRemoteWorkspaceCache(remote: RemoteWorkspace): Promise<void> {
  const cacheKey = getRemoteCacheKey(remote);
  try {
    const [cachedPosts, cachedTree, cachedMetadata] = await Promise.all([
      loadPostsCache(cacheKey),
      loadFileTreeCache(cacheKey),
      loadRemoteMetadataCache(cacheKey),
    ]);

    if (!isActiveRemote(remote)) return;

    if (cachedMetadata) {
      remote.fileMetadata.clear();
      Object.entries(cachedMetadata).forEach(([path, data]) => {
        remote.fileMetadata.set(path, { ...data });
      });
    }

    const updates: Partial<WorkspaceState> = {};

    if (cachedTree && cachedTree.length > 0) {
      updates.fileTree = cachedTree;
    }

    if (cachedPosts && cachedPosts.length > 0) {
      updates.posts = cachedPosts;
      updates.isLoading = false;
    }

    if (Object.keys(updates).length > 0) {
      state = { ...state, ...updates };
      notify();
    }
  } catch {
    // Ignore cache hydration errors
  }
}

async function persistRemotePostsCache(): Promise<void> {
  const remote = state.workspace?.remote;
  if (!remote) return;
  try {
    await savePostsCache(getRemoteCacheKey(remote), state.posts);
  } catch {
    // Ignore cache save errors
  }
}

async function persistRemoteTreeCache(tree: FileTreeItem[]): Promise<void> {
  const remote = state.workspace?.remote;
  if (!remote) return;
  try {
    await saveFileTreeCache(getRemoteCacheKey(remote), tree);
  } catch {
    // Ignore cache save errors
  }
}

async function persistRemoteMetadataCache(): Promise<void> {
  const remote = state.workspace?.remote;
  if (!remote) return;
  try {
    const metadata: RemoteMetadataCache = {};
    remote.fileMetadata.forEach((value, key) => {
      metadata[key] = { ...value };
    });
    await saveRemoteMetadataCache(getRemoteCacheKey(remote), metadata);
  } catch {
    // Ignore cache save errors
  }
}

export function subscribeWorkspace(listener: Listener): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

export function getWorkspaceState(): WorkspaceState {
  return state;
}

/**
 * Connect to a remote repository
 */
export async function connectRemoteWorkspace(
  provider: 'github' | 'gitlab',
  token: string,
  repository: {
    id: string;
    name: string;
    fullName: string;
    owner?: string;
    branch: string;
    defaultBranch: string;
    url: string;
  },
  options: ConnectRemoteOptions = {}
): Promise<void> {
  const { autoRefresh = true, hasCachedData = false } = options;
  const remoteWorkspace: RemoteWorkspace = {
    provider,
    token,
    repository,
    fileMetadata: new Map(),
  };

  state = {
    workspace: {
      type: 'remote',
      remote: remoteWorkspace,
    },
    posts: [],
    fileTree: [],
    isLoading: autoRefresh || !hasCachedData,
  };
  notify();

  const hydratePromise = hydrateRemoteWorkspaceCache(remoteWorkspace);

  if (!autoRefresh) {
    await hydratePromise;
    return;
  }

  try {
    await refreshRemoteWorkspace();
  } catch (error) {
    console.error('Failed to connect remote workspace:', error);
    throw error;
  }
}

/**
 * Refresh remote workspace (fetch all files)
 */
export async function refreshRemoteWorkspace(): Promise<void> {
  if (!state.workspace?.remote) {
    throw new Error('No remote workspace connected');
  }

  const remote = state.workspace.remote;
  state = { ...state, isLoading: true };
  notify();

  try {
    const { files, tree } = await fetchRemoteFiles(remote);

    if (!isActiveRemote(remote)) {
      return;
    }

    console.log(`[Remote] 📁 Found ${files.length} markdown files in ${remote.repository.fullName}`);

    // Update file metadata
    updateFileMetadata(remote, files);
    await persistRemoteMetadataCache();

    // Update tree
    state = { ...state, fileTree: tree, isLoading: false };
    notify();
    await persistRemoteTreeCache(tree);

    if (files.length === 0) {
      console.warn('[Remote] No markdown files found in repository');
      state = { ...state, posts: [], isLoading: false };
      notify();
      return;
    }

    // Parse all markdown files (limit concurrency to avoid rate limits)
    const posts: MarkdownFile[] = [];
    const chunkSize = 5; // Process 5 files at a time

    console.log(`[Remote] 📄 Loading ${files.length} markdown files...`);

    for (let i = 0; i < files.length; i += chunkSize) {
      if (!isActiveRemote(remote)) {
        return;
      }

      const chunk = files.slice(i, i + chunkSize);
      const results = await Promise.allSettled(
        chunk.map(file => parseRemoteMarkdownFile(remote, file.path))
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          posts.push(result.value);
        } else {
          console.error('[Remote] Failed to parse file:', result.reason);
        }
      }

      // Update state progressively
      if (!isActiveRemote(remote)) {
        return;
      }

      state = { ...state, posts: [...posts] };
      notify();

      // Only log every 10 files to reduce console spam
      if ((i + chunkSize) % 10 === 0 || i + chunkSize >= files.length) {
        console.log(`[Remote] 📊 Loaded ${posts.length}/${files.length} files...`);
      }
    }

    console.log(`[Remote] ✅ Successfully loaded ${posts.length} markdown files`);

    state = { ...state, posts, isLoading: false };
    notify();
    await persistRemotePostsCache();
  } catch (error) {
    console.error('Failed to refresh remote workspace:', error);
    state = { ...state, isLoading: false };
    notify();
    throw error;
  }
}

/**
 * Load a single remote file
 */
export async function loadRemoteFile(path: string): Promise<MarkdownFile> {
  if (!state.workspace?.remote) {
    throw new Error('No remote workspace connected');
  }

  return await parseRemoteMarkdownFile(state.workspace.remote, path);
}

/**
 * Save a remote file
 */
export async function saveRemoteFileContent(
  path: string,
  content: string,
  frontmatter: Record<string, unknown>,
  commitMessage?: string
): Promise<void> {
  if (!state.workspace?.remote) {
    throw new Error('No remote workspace connected');
  }

  const message = commitMessage || generateCommitMessage(
    path.split('/').pop() || path,
    state.posts.some(p => p.path === path) ? 'update' : 'create'
  );

  await saveRemoteFile(
    state.workspace.remote,
    path,
    content,
    frontmatter,
    message
  );

  await persistRemoteMetadataCache();

  // Update local state
  const updated: MarkdownFile = {
    name: path.split('/').pop() || path,
    path,
    content,
    frontmatter,
    rawContent: '', // Will be populated on next refresh
  };

  const existingIndex = state.posts.findIndex(p => p.path === path);
  if (existingIndex >= 0) {
    state.posts[existingIndex] = updated;
  } else {
    state.posts.push(updated);
  }

  state = { ...state, posts: [...state.posts] };
  notify();

  await persistRemotePostsCache();
  await persistRemoteMetadataCache();
}

/**
 * Delete a remote file
 */
export async function deleteRemoteFileFromWorkspace(
  path: string,
  commitMessage?: string
): Promise<void> {
  if (!state.workspace?.remote) {
    throw new Error('No remote workspace connected');
  }

  const message = commitMessage || `Delete: ${path.split('/').pop() || path}`;

  await deleteRemoteFile(state.workspace.remote, path, message);

  // Update local state
  state = {
    ...state,
    posts: state.posts.filter(p => p.path !== path),
  };
  notify();

  await persistRemotePostsCache();
}

/**
 * Rename a remote file
 */
export async function renameRemoteFileInWorkspace(
  oldPath: string,
  newPath: string,
  commitMessage?: string
): Promise<void> {
  if (!state.workspace?.remote) {
    throw new Error('No remote workspace connected');
  }

  const message = commitMessage || `Rename: ${oldPath} → ${newPath}`;

  await renameRemoteFile(state.workspace.remote, oldPath, newPath, message);

  // Update local state
  const post = state.posts.find(p => p.path === oldPath);
  if (post) {
    post.path = newPath;
    post.name = newPath.split('/').pop() || newPath;
  }

  state = { ...state, posts: [...state.posts] };
  notify();

  await persistRemotePostsCache();
  await persistRemoteMetadataCache();
}

/**
 * Disconnect workspace
 */
export function disconnectWorkspace(): void {
  state = {
    workspace: null,
    posts: [],
    fileTree: [],
    isLoading: false,
  };
  notify();
}

/**
 * Check if workspace is remote
 */
export function isRemoteWorkspace(): boolean {
  return state.workspace?.type === 'remote';
}

/**
 * Get current remote workspace
 */
export function getCurrentRemoteWorkspace(): RemoteWorkspace | null {
  return state.workspace?.remote || null;
}

