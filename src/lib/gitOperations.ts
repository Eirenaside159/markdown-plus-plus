import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';

export interface GitStatus {
  isGitRepo: boolean;
  currentBranch: string | null;
  hasChanges: boolean;
  error?: string;
}

export interface PublishOptions {
  filePath: string;
  commitMessage: string;
  branch?: string;
  gitAuthor?: string;
  gitEmail?: string;
}

export interface PublishResult {
  success: boolean;
  message: string;
  error?: string;
  pushed?: boolean;
  needsManualPush?: boolean;
  commitSha?: string;
}

/**
 * Check if the directory is a git repository
 */
export async function checkGitStatus(
  dirHandle: FileSystemDirectoryHandle
): Promise<GitStatus> {
  try {
    // Check if .git directory exists
    try {
      await dirHandle.getDirectoryHandle('.git');
    } catch (error) {
      return {
        isGitRepo: false,
        currentBranch: null,
        hasChanges: false,
        error: 'No .git directory found. Please select the project root folder.',
      };
    }

    // Get current branch
    let currentBranch = 'main';
    
    try {
      const gitDir = await dirHandle.getDirectoryHandle('.git');
      const headFile = await gitDir.getFileHandle('HEAD');
      const file = await headFile.getFile();
      const content = await file.text();
      const match = content.match(/ref: refs\/heads\/(.+)/);
      if (match) {
        currentBranch = match[1].trim();
      }
    } catch (headError) {
      // Fallback: Use isomorphic-git
      try {
        const fs = createFileSystemAdapter(dirHandle);
        const branch = await git.currentBranch({
          fs,
          dir: '/',
          fullname: false,
        });
        if (branch && typeof branch === 'string') {
          currentBranch = branch;
        }
      } catch (error) {
        // Ignore, use default 'main'
      }
    }

    // Check for uncommitted changes (optional, might fail)
    let hasChanges = false;
    try {
      const fs = createFileSystemAdapter(dirHandle);
      const status = await git.statusMatrix({
        fs,
        dir: '/',
      });

      if (Array.isArray(status)) {
        const changedFiles = status.filter(
          ([, head, workdir, stage]) => head !== workdir || workdir !== stage
        );
        hasChanges = changedFiles.length > 0;
      }
    } catch (error) {
      // Not critical, continue anyway - we can still commit and push
    }

    return {
      isGitRepo: true,
      currentBranch,
      hasChanges,
    };
  } catch (error) {
    return {
      isGitRepo: false,
      currentBranch: null,
      hasChanges: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Publish changes (add, commit, and push)
 */
export async function publishFile(
  dirHandle: FileSystemDirectoryHandle,
  options: PublishOptions
): Promise<PublishResult> {
  const { filePath, commitMessage, branch = 'main', gitAuthor, gitEmail } = options;

  try {
    const fs = createFileSystemAdapter(dirHandle);

    // Verify file exists before staging
    try {
      await fs.promises.readFile('/' + filePath);
    } catch (readError) {
      throw new Error('File not found: ' + filePath);
    }

    // Prepare cache with config to avoid reading issues
    const cache: any = {};
    
    // Stage the file (git add)
    try {
      await git.add({
        fs,
        dir: '/',
        filepath: filePath,
        cache,
      });
    } catch (addError) {
      throw new Error('Failed to stage file: ' + (addError instanceof Error ? addError.message : 'Unknown error'));
    }

    // Get git config for author info
    // Priority: 1) Settings from options 2) .git/config 3) Default values
    let name = 'Markdown++ User';
    let email = 'user@mdadmin.local';
    
    // Use provided gitAuthor and gitEmail if available
    if (gitAuthor && gitAuthor.trim()) {
      name = gitAuthor.trim();
    }
    if (gitEmail && gitEmail.trim()) {
      email = gitEmail.trim();
    }
    
    // If not provided in options, try to read from .git/config
    if (name === 'Markdown++ User' || email === 'user@mdadmin.local') {
      try {
        // Try to read config file directly
        const gitDir = await dirHandle.getDirectoryHandle('.git');
        const configFile = await gitDir.getFileHandle('config');
        const file = await configFile.getFile();
        const content = await file.text();
        
        // Parse user name if not already set
        if (name === 'Markdown++ User') {
          const nameMatch = content.match(/\[user\][\s\S]*?name\s*=\s*(.+)/);
          if (nameMatch && nameMatch[1]) {
            name = nameMatch[1].trim();
          }
        }
        
        // Parse user email if not already set
        if (email === 'user@mdadmin.local') {
          const emailMatch = content.match(/\[user\][\s\S]*?email\s*=\s*(.+)/);
          if (emailMatch && emailMatch[1]) {
            email = emailMatch[1].trim();
          }
        }
      } catch (configError) {
        // Could not load git config, using defaults
      }
    }

    // Commit the changes
    let commitSha: string;
    try {
      commitSha = await git.commit({
        fs,
        dir: '/',
        message: commitMessage,
        author: {
          name,
          email,
        },
        cache,
      });
    } catch (commitError) {
      throw new Error('Failed to commit: ' + (commitError instanceof Error ? commitError.message : 'Unknown error'));
    }

    // Get remote URL to check protocol
    let remoteUrl = '';
    let usesSsh = false;
    try {
      remoteUrl = await git.getConfig({ fs, dir: '/', path: 'remote.origin.url' }) || '';
      usesSsh = remoteUrl.startsWith('git@') || remoteUrl.startsWith('ssh://');
    } catch (error) {
      // Could not detect remote URL
    }

    // Try to push to remote (may fail due to browser limitations, that's OK)
    try {
      await git.push({
        fs,
        http,
        dir: '/',
        remote: 'origin',
        ref: branch,
        cache,
      });

      return {
        success: true,
        message: `Successfully published to ${branch}! 🚀\n\nCommit: ${commitSha.substring(0, 7)}\nChanges have been pushed to remote.`,
        pushed: true,
        needsManualPush: false,
        commitSha: commitSha.substring(0, 7),
      };
    } catch (pushError) {
      // Check if it's SSH protocol issue
      if (usesSsh) {
        return {
          success: true,
          message: `✅ Changes committed successfully!\n\nCommit: ${commitSha.substring(0, 7)}\n\n📡 Your repository uses SSH protocol which cannot be pushed from browser.\n\nTo publish, run in your terminal:\n\ncd ${dirHandle.name}\ngit push origin ${branch}\n\n💡 Tip: If you want automatic push, change remote URL to HTTPS:\ngit remote set-url origin https://gitlab.com/itsmoneo/moneo.com.tr.git`,
          pushed: false,
          needsManualPush: true,
          commitSha: commitSha.substring(0, 7),
        };
      }
      
      // Generic push failure
      return {
        success: true,
        message: `✅ Changes committed successfully!\n\nCommit: ${commitSha.substring(0, 7)}\n\nTo publish to remote, run this in your terminal:\n\ncd ${dirHandle.name}\ngit push origin ${branch}`,
        pushed: false,
        needsManualPush: true,
        commitSha: commitSha.substring(0, 7),
      };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Failed to publish changes',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate a commit message based on the file and action
 */
export function generateCommitMessage(
  fileName: string,
  action: 'create' | 'update' = 'update'
): string {
  const timestamp = new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  if (action === 'create') {
    return `Create: ${fileName}\n\nCreated via Markdown++ on ${timestamp}`;
  }

  return `Update: ${fileName}\n\nUpdated via Markdown++ on ${timestamp}`;
}

/**
 * Get the list of changed files
 */
export async function getChangedFiles(
  dirHandle: FileSystemDirectoryHandle
): Promise<string[]> {
  try {
    const fs = createFileSystemAdapter(dirHandle);
    const status = await git.statusMatrix({
      fs,
      dir: '/',
    });

    return status
      .filter(([, head, workdir]) => head !== workdir)
      .map(([filepath]) => filepath)
      .filter((path) => path.endsWith('.md'));
  } catch (error) {
    return [];
  }
}

/**
 * Create a Stats-like object with Node.js fs.Stats methods and properties
 */
function createStats(info: { type: 'file' | 'dir'; mode: number; size: number; mtimeMs: number }) {
  const isDirectory = info.type === 'dir';
  const isFile = info.type === 'file';
  
  // Create Date objects for timestamps
  const mtime = new Date(info.mtimeMs);
  const ctime = new Date(info.mtimeMs);
  const atime = new Date(info.mtimeMs);
  const birthtime = new Date(info.mtimeMs);
  
  return {
    // Type info (our custom property)
    type: info.type,
    
    // Required Node.js fs.Stats properties
    dev: 0,
    ino: 0,
    mode: info.mode,
    nlink: 1,
    uid: 1000,
    gid: 1000,
    rdev: 0,
    size: info.size,
    blksize: 4096,
    blocks: Math.ceil(info.size / 512),
    
    // Timestamps in milliseconds
    atimeMs: info.mtimeMs,
    mtimeMs: info.mtimeMs,
    ctimeMs: info.mtimeMs,
    birthtimeMs: info.mtimeMs,
    
    // Timestamps as Date objects
    atime,
    mtime,
    ctime,
    birthtime,
    
    // Node.js fs.Stats methods
    isFile: () => isFile,
    isDirectory: () => isDirectory,
    isSymbolicLink: () => false,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
  };
}

/**
 * Create a file system adapter for isomorphic-git
 */
function createFileSystemAdapter(dirHandle: FileSystemDirectoryHandle): any {
  const adapter = {
    promises: {
      readFile: async (filepath: string, options?: { encoding?: string }) => {
        try {
          const path = filepath.startsWith('/') ? filepath.slice(1) : filepath;
          const parts = path.split('/').filter(p => p && p !== '.');
          let currentHandle: any = dirHandle;

          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (part !== '..') {
              currentHandle = await currentHandle.getDirectoryHandle(part);
            }
          }

          const fileName = parts[parts.length - 1];
          const fileHandle = await currentHandle.getFileHandle(fileName);
          const file = await fileHandle.getFile();
          
          // Check if encoding is specified (for text files like .git/config)
          if (options?.encoding === 'utf8' || options?.encoding === 'utf-8') {
            return await file.text();
          }
          
          // For binary files or when no encoding specified, return Uint8Array
          const buffer = await file.arrayBuffer();
          return new Uint8Array(buffer);
        } catch (err) {
          const error: any = new Error(`ENOENT: no such file or directory, open '${filepath}'`);
          error.code = 'ENOENT';
          error.errno = -2;
          error.syscall = 'open';
          error.path = filepath;
          throw error;
        }
      },

      writeFile: async (filepath: string, data: Uint8Array) => {
        try {
          const path = filepath.startsWith('/') ? filepath.slice(1) : filepath;
          const parts = path.split('/').filter(p => p && p !== '.');
          let currentHandle: any = dirHandle;

          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (part !== '..') {
              currentHandle = await currentHandle.getDirectoryHandle(part, { create: true });
            }
          }

          const fileName = parts[parts.length - 1];
          const fileHandle = await currentHandle.getFileHandle(fileName, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(data);
          await writable.close();
        } catch (err) {
          const error: any = new Error(`EACCES: permission denied, open '${filepath}'`);
          error.code = 'EACCES';
          error.errno = -13;
          error.syscall = 'open';
          error.path = filepath;
          throw error;
        }
      },

      unlink: async (filepath: string) => {
        const path = filepath.startsWith('/') ? filepath.slice(1) : filepath;
        const parts = path.split('/').filter(p => p && p !== '.');
        let currentHandle: any = dirHandle;

        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (part !== '..') {
            currentHandle = await currentHandle.getDirectoryHandle(part);
          }
        }

        const fileName = parts[parts.length - 1];
        await currentHandle.removeEntry(fileName);
      },

      readdir: async (filepath: string) => {
        try {
          const path = filepath.startsWith('/') ? filepath.slice(1) : filepath;
          let currentHandle: any = dirHandle;

          // Handle special cases: '.', '..' or empty path
          if (path && path !== '.' && path !== '..') {
            const parts = path.split('/').filter(p => p && p !== '.' && p !== '..');
            for (const part of parts) {
              currentHandle = await currentHandle.getDirectoryHandle(part);
            }
          }

          const entries: string[] = [];
          for await (const entry of currentHandle.values()) {
            entries.push(entry.name);
          }
          return entries;
        } catch (err) {
          const error: any = new Error(`ENOENT: no such file or directory, scandir '${filepath}'`);
          error.code = 'ENOENT';
          error.errno = -2;
          error.syscall = 'scandir';
          error.path = filepath;
          throw error;
        }
      },

      mkdir: async (filepath: string) => {
        const path = filepath.startsWith('/') ? filepath.slice(1) : filepath;
        const parts = path.split('/').filter(p => p && p !== '.' && p !== '..');
        let currentHandle: any = dirHandle;

        for (const part of parts) {
          currentHandle = await currentHandle.getDirectoryHandle(part, { create: true });
        }
      },

      rmdir: async (filepath: string) => {
        const path = filepath.startsWith('/') ? filepath.slice(1) : filepath;
        const parts = path.split('/').filter(p => p && p !== '.');
        let currentHandle: any = dirHandle;

        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (part !== '..') {
            currentHandle = await currentHandle.getDirectoryHandle(part);
          }
        }

        const dirName = parts[parts.length - 1];
        await currentHandle.removeEntry(dirName, { recursive: true });
      },

      stat: async (filepath: string) => {
        try {
          const path = filepath.startsWith('/') ? filepath.slice(1) : filepath;
          
          // Handle special cases: empty path, '.', or '..'
          if (!path || path === '.' || path === '..') {
            return createStats({ type: 'dir', mode: 0o777, size: 0, mtimeMs: Date.now() });
          }

          const parts = path.split('/').filter(p => p && p !== '.');
          let currentHandle: any = dirHandle;

          // Try as directory first
          try {
            for (let i = 0; i < parts.length; i++) {
              const part = parts[i];
              if (part === '..') {
                // Can't go up from root, skip
                continue;
              }
              currentHandle = await currentHandle.getDirectoryHandle(part);
            }
            return createStats({ type: 'dir', mode: 0o777, size: 0, mtimeMs: Date.now() });
          } catch {
            // Try as file
            currentHandle = dirHandle;
            for (let i = 0; i < parts.length - 1; i++) {
              const part = parts[i];
              if (part !== '..') {
                currentHandle = await currentHandle.getDirectoryHandle(part);
              }
            }
            const fileName = parts[parts.length - 1];
            const fileHandle = await currentHandle.getFileHandle(fileName);
            const file = await fileHandle.getFile();
            return createStats({ type: 'file', mode: 0o666, size: file.size, mtimeMs: file.lastModified });
          }
        } catch (err) {
          // Return a Node.js-style error that isomorphic-git expects
          const error: any = new Error(`ENOENT: no such file or directory, stat '${filepath}'`);
          error.code = 'ENOENT';
          error.errno = -2;
          error.syscall = 'stat';
          error.path = filepath;
          throw error;
        }
      },

      lstat: async (filepath: string) => {
        return adapter.promises.stat(filepath);
      },

      readlink: async () => {
        throw new Error('Symbolic links are not supported');
      },

      symlink: async () => {
        throw new Error('Symbolic links are not supported');
      },

      chmod: async () => {
        // No-op for browser file system
      },
    },
  };
  return adapter;
}

