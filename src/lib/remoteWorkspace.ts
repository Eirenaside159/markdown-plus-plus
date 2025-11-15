import type { MarkdownFile, FileTreeItem, RemoteWorkspace } from '@/types';
import { parseMarkdown, stringifyMarkdown } from '@/lib/markdown';
import { createRemoteProvider, type RemoteFile } from './remoteProviders';

/**
 * Fetch all markdown files from remote repository
 */
export async function fetchRemoteFiles(
  workspace: RemoteWorkspace
): Promise<{ files: RemoteFile[]; tree: FileTreeItem[] }> {
  const provider = createRemoteProvider(workspace.provider, workspace.token);
  
  const files = await provider.getMarkdownFiles(
    workspace.repository.id,
    workspace.repository.branch
  );

  // Build file tree from flat file list
  const tree = buildFileTree(files.map(f => f.path));

  return { files, tree };
}

/**
 * Read a single file content from remote
 */
export async function readRemoteFile(
  workspace: RemoteWorkspace,
  path: string
): Promise<{ content: string; sha?: string }> {
  const provider = createRemoteProvider(workspace.provider, workspace.token);
  
  const content = await provider.getFileContent(
    workspace.repository.id,
    path,
    workspace.repository.branch
  );

  // Update metadata cache
  const metadata = workspace.fileMetadata.get(path);
  const now = Date.now();
  
  if (metadata) {
    metadata.lastFetched = now;
  }

  return { content, sha: metadata?.sha };
}

/**
 * Parse a remote markdown file
 */
export async function parseRemoteMarkdownFile(
  workspace: RemoteWorkspace,
  path: string
): Promise<MarkdownFile> {
  const { content } = await readRemoteFile(workspace, path);
  const name = path.split('/').pop() || path;
  const parsed = parseMarkdown(content, path, name);
  
  // Ensure metadata exists (mark file as existing in repository)
  if (!workspace.fileMetadata.has(path)) {
    workspace.fileMetadata.set(path, {
      lastFetched: Date.now(),
    });
  }
  
  return {
    name,
    path,
    content: parsed.content,
    frontmatter: parsed.frontmatter,
    rawContent: content,
  };
}

/**
 * Save (update or create) a file to remote repository
 */
export async function saveRemoteFile(
  workspace: RemoteWorkspace,
  path: string,
  content: string,
  frontmatter: Record<string, unknown>,
  commitMessage: string
): Promise<void> {
  const provider = createRemoteProvider(workspace.provider, workspace.token);
  
  // Serialize markdown with frontmatter
  const fullContent = stringifyMarkdown({
    name: path.split('/').pop() || path,
    path,
    content,
    frontmatter,
    rawContent: '',
  } as MarkdownFile);
  
  // Check if file exists in metadata (means we've loaded it before)
  const metadata = workspace.fileMetadata.get(path);
  const fileExists = metadata !== undefined;
  
  const isGitHub = workspace.provider === 'github';
  
  try {
    if (fileExists) {
      // File exists in repository - UPDATE
      console.log(`[Remote] Updating file: ${path}`);
      
      const result = await provider.updateFile(
        workspace.repository.id,
        path,
        fullContent,
        commitMessage,
        metadata?.sha, // GitHub needs SHA, GitLab doesn't
        workspace.repository.branch
      );
      
      // Update metadata
      workspace.fileMetadata.set(path, {
        sha: result.sha,
        lastFetched: Date.now(),
      });
    } else {
      // New file - CREATE
      console.log(`[Remote] Creating new file: ${path}`);
      
      const result = await provider.createFile(
        workspace.repository.id,
        path,
        fullContent,
        commitMessage,
        workspace.repository.branch
      );
      
      // Add to metadata
      workspace.fileMetadata.set(path, {
        sha: result.sha,
        lastFetched: Date.now(),
      });
    }
  } catch (error: any) {
    console.error(`[Remote] Save error for ${path}:`, error);
    
    // GitLab specific: If update fails with 404, file was deleted - try create
    if (!isGitHub && fileExists && error.statusCode === 404) {
      console.log(`[Remote] File deleted externally, creating new: ${path}`);
      
      const result = await provider.createFile(
        workspace.repository.id,
        path,
        fullContent,
        commitMessage,
        workspace.repository.branch
      );
      
      workspace.fileMetadata.set(path, {
        sha: result.sha,
        lastFetched: Date.now(),
      });
    } else {
      throw error;
    }
  }
}

/**
 * Delete a file from remote repository
 */
export async function deleteRemoteFile(
  workspace: RemoteWorkspace,
  path: string,
  commitMessage: string
): Promise<void> {
  const provider = createRemoteProvider(workspace.provider, workspace.token);
  
  const metadata = workspace.fileMetadata.get(path);
  
  await provider.deleteFile(
    workspace.repository.id,
    path,
    commitMessage,
    metadata?.sha,
    workspace.repository.branch
  );
  
  // Remove from metadata
  workspace.fileMetadata.delete(path);
}

/**
 * Rename/move a file in remote repository
 */
export async function renameRemoteFile(
  workspace: RemoteWorkspace,
  oldPath: string,
  newPath: string,
  commitMessage: string
): Promise<void> {
  // Read old file
  const { content } = await readRemoteFile(workspace, oldPath);
  
  // Create new file
  const provider = createRemoteProvider(workspace.provider, workspace.token);
  const result = await provider.createFile(
    workspace.repository.id,
    newPath,
    content,
    commitMessage,
    workspace.repository.branch
  );
  
  // Delete old file
  const oldMetadata = workspace.fileMetadata.get(oldPath);
  await provider.deleteFile(
    workspace.repository.id,
    oldPath,
    `Delete old file: ${oldPath}`,
    oldMetadata?.sha,
    workspace.repository.branch
  );
  
  // Update metadata
  workspace.fileMetadata.delete(oldPath);
  workspace.fileMetadata.set(newPath, {
    sha: result.sha,
    lastFetched: Date.now(),
  });
}

/**
 * Build file tree structure from flat file paths
 */
function buildFileTree(paths: string[]): FileTreeItem[] {
  const root: FileTreeItem[] = [];
  
  for (const path of paths) {
    const parts = path.split('/');
    let currentLevel = root;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join('/');
      
      let existing = currentLevel.find(item => item.name === part);
      
      if (!existing) {
        existing = {
          name: part,
          path: currentPath,
          isDirectory: !isLast,
          children: isLast ? undefined : [],
        };
        currentLevel.push(existing);
      }
      
      if (!isLast && existing.children) {
        currentLevel = existing.children;
      }
    }
  }
  
  // Sort: directories first, then by name
  const sortTree = (items: FileTreeItem[]): FileTreeItem[] => {
    items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
    
    items.forEach(item => {
      if (item.children) {
        sortTree(item.children);
      }
    });
    
    return items;
  };
  
  return sortTree(root);
}

/**
 * Update file metadata (SHA) after fetching from remote
 */
export function updateFileMetadata(
  workspace: RemoteWorkspace,
  files: RemoteFile[]
): void {
  for (const file of files) {
    const existing = workspace.fileMetadata.get(file.path);
    workspace.fileMetadata.set(file.path, {
      sha: file.sha || existing?.sha,
      lastFetched: Date.now(),
    });
  }
}

