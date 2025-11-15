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

interface WorkspaceState {
  workspace: Workspace | null;
  posts: MarkdownFile[];
  fileTree: FileTreeItem[];
  isLoading: boolean;
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
  }
): Promise<void> {
  state = {
    workspace: {
      type: 'remote',
      remote: {
        provider,
        token,
        repository,
        fileMetadata: new Map(),
      },
    },
    posts: [],
    fileTree: [],
    isLoading: true,
  };
  notify();

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

  state = { ...state, isLoading: true };
  notify();

  try {
    const { files, tree } = await fetchRemoteFiles(state.workspace.remote);

    console.log(`[Remote] 📁 Found ${files.length} markdown files in ${state.workspace.remote.repository.fullName}`);

    // Update file metadata
    updateFileMetadata(state.workspace.remote, files);

    // Update tree
    state = { ...state, fileTree: tree, isLoading: false };
    notify();

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
      const chunk = files.slice(i, i + chunkSize);
      const results = await Promise.allSettled(
        chunk.map(file => parseRemoteMarkdownFile(state.workspace!.remote!, file.path))
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          posts.push(result.value);
        } else {
          console.error('[Remote] Failed to parse file:', result.reason);
        }
      }

      // Update state progressively
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

