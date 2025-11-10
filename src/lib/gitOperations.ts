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
  gitToken?: string;
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

// Track ongoing publish operations to prevent concurrent pushes
let isPublishInProgress = false;

/**
 * Publish changes (add, commit, and push)
 */
export async function publishFile(
  dirHandle: FileSystemDirectoryHandle,
  options: PublishOptions
): Promise<PublishResult> {
  const { filePath, commitMessage, branch = 'main', gitAuthor, gitEmail, gitToken } = options;

  // Prevent concurrent publish operations
  if (isPublishInProgress) {
    return {
      success: false,
      message: 'Another publish operation is already in progress',
      error: 'A publish operation is already running. Please wait for it to complete.',
    };
  }

  isPublishInProgress = true;

  try {
    const fs = createFileSystemAdapter(dirHandle);

    // Verify file exists before staging
    try {
      await fs.promises.readFile('/' + filePath);
    } catch (readError) {
      console.error('[Git Publish] File read error:', readError);
      throw new Error(`File not found: ${filePath}\n\nMake sure the file exists and hasn't been deleted.`);
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
      console.error('[Git Publish] Stage error:', addError);
      const addErrorMsg = addError instanceof Error ? addError.message : 'Unknown error';
      throw new Error(`Failed to stage file: ${addErrorMsg}\n\nThis might happen if:\n• The .git directory is corrupted\n• File permissions are incorrect\n• The file path is invalid`);
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
      console.error('[Git Publish] Commit error:', commitError);
      const commitErrorMsg = commitError instanceof Error ? commitError.message : 'Unknown error';
      throw new Error(`Failed to create commit: ${commitErrorMsg}\n\nPossible causes:\n• No changes to commit (file unchanged)\n• Author name/email not configured\n• .git repository is corrupted\n\nTry:\n• Make sure you've changed the file\n• Check Settings → Git for author info\n• Verify .git directory is valid`);
    }

    // Get remote URL to check protocol and provider
    let remoteUrl = '';
    let usesSsh = false;
    let isGitLab = false;
    try {
      remoteUrl = await git.getConfig({ fs, dir: '/', path: 'remote.origin.url' }) || '';
      usesSsh = remoteUrl.startsWith('git@') || remoteUrl.startsWith('ssh://');
      isGitLab = remoteUrl.includes('gitlab.com') || remoteUrl.includes('gitlab');
    } catch (error) {
      // Could not detect remote URL
    }

    // SSH protocol cannot be used from browser
    if (usesSsh) {
      return {
        success: true,
        message: `✅ Changes committed successfully!\n\nCommit: ${commitSha.substring(0, 7)}\n\n📡 Your repository uses SSH protocol which cannot be pushed from browser.\n\nTo publish, run in your terminal:\n\ncd ${dirHandle.name}\ngit push origin ${branch}\n\n💡 Tip: For automatic push from browser, change remote URL to HTTPS:\ngit remote set-url origin https://gitlab.com/itsmoneo/moneo.com.tr.git`,
        pushed: false,
        needsManualPush: true,
        commitSha: commitSha.substring(0, 7),
      };
    }

    // Try to push to remote using CORS proxy for HTTPS repos
    try {
      await git.push({
        fs,
        http,
        dir: '/',
        remote: 'origin',
        ref: branch,
        cache,
        corsProxy: 'https://cors.isomorphic-git.org',
        onAuth: () => {
          // If user provided a Personal Access Token, use it
          if (gitToken && gitToken.trim()) {
            const token = gitToken.trim();
            
            // GitLab uses different auth format than GitHub
            if (isGitLab) {
              // GitLab: username can be anything (oauth2, token, etc), password is the token
              return {
                username: 'oauth2',
                password: token,
              };
            } else {
              // GitHub/others: username is the token, password can be empty or x-oauth-basic
              return {
                username: token,
                password: '',
              };
            }
          }
          // Try without auth (works for public repos)
          return { username: '', password: '' };
        },
      });

      return {
        success: true,
        message: `Successfully published to ${branch}! 🚀\n\nCommit: ${commitSha.substring(0, 7)}\nChanges have been pushed to remote.`,
        pushed: true,
        needsManualPush: false,
        commitSha: commitSha.substring(0, 7),
      };
    } catch (pushError) {
      // Get error details for better user feedback
      const errorMessage = pushError instanceof Error ? pushError.message : String(pushError);
      const errorLower = errorMessage.toLowerCase();
      
      console.error('[Git Push Error]', pushError);
      
      // Classify error types for better user guidance
      const isAuthError = errorMessage.includes('401') || 
                         errorMessage.includes('403') || 
                         errorLower.includes('unauthorized') ||
                         errorLower.includes('authentication') ||
                         errorLower.includes('credentials');
      
      const isNetworkError = errorLower.includes('network') ||
                            errorLower.includes('fetch failed') ||
                            errorLower.includes('connection') ||
                            errorLower.includes('timeout') ||
                            errorLower.includes('enotfound') ||
                            errorLower.includes('cors');
      
      const isRateLimitError = errorMessage.includes('429') ||
                              errorLower.includes('rate limit') ||
                              errorLower.includes('too many requests');
      
      const isTokenError = errorLower.includes('token') && 
                          (errorLower.includes('invalid') || 
                           errorLower.includes('expired') || 
                           errorLower.includes('revoked'));
      
      const isPermissionError = errorLower.includes('permission') ||
                               errorLower.includes('forbidden') ||
                               errorMessage.includes('403');
      
      const isNotFoundError = errorMessage.includes('404') ||
                             errorLower.includes('not found') ||
                             errorLower.includes('repository does not exist');
      
      // Authentication error - wrong/missing token
      if (isAuthError || isTokenError) {
        const tokenAdvice = isGitLab 
          ? 'GitLab Personal Access Token with write_repository scope'
          : 'GitHub Personal Access Token with repo scope';
        
        return {
          success: true,
          message: `✅ Changes committed locally!\n\nCommit: ${commitSha.substring(0, 7)}\n\n🔐 Push failed: Authentication Error\n\n${
            isTokenError 
              ? 'Your access token is invalid, expired, or revoked.' 
              : 'Authentication required to push to this repository.'
          }\n\n**Solution:**\n1. Go to Settings → Git\n2. Add a valid ${tokenAdvice}\n3. Try publishing again\n\n**Or push manually:**\ncd ${dirHandle.name}\ngit push origin ${branch}`,
          pushed: false,
          needsManualPush: true,
          commitSha: commitSha.substring(0, 7),
        };
      }
      
      // Network/CORS error
      if (isNetworkError) {
        return {
          success: true,
          message: `✅ Changes committed locally!\n\nCommit: ${commitSha.substring(0, 7)}\n\n🌐 Push failed: Network Error\n\nCouldn't reach the remote repository. This might be due to:\n• No internet connection\n• CORS proxy unavailable\n• Firewall blocking the request\n• Remote server is down\n\n**Solutions:**\n1. Check your internet connection\n2. Try again in a few moments\n3. Or push manually:\n\ncd ${dirHandle.name}\ngit push origin ${branch}\n\n💡 Tip: Manual push always works when browser fails`,
          pushed: false,
          needsManualPush: true,
          commitSha: commitSha.substring(0, 7),
        };
      }
      
      // Rate limit error
      if (isRateLimitError) {
        return {
          success: true,
          message: `✅ Changes committed locally!\n\nCommit: ${commitSha.substring(0, 7)}\n\n⏱️ Push failed: Rate Limit Exceeded\n\nYou've made too many requests. Please wait a few minutes and try again.\n\n**Or push manually now:**\ncd ${dirHandle.name}\ngit push origin ${branch}`,
          pushed: false,
          needsManualPush: true,
          commitSha: commitSha.substring(0, 7),
        };
      }
      
      // Permission error
      if (isPermissionError) {
        return {
          success: true,
          message: `✅ Changes committed locally!\n\nCommit: ${commitSha.substring(0, 7)}\n\n🚫 Push failed: Permission Denied\n\nYou don't have permission to push to this repository.\n\n**Possible causes:**\n• Token doesn't have write access\n• Not a collaborator on this repo\n• Branch is protected\n\n**Solution:**\n1. Check repository permissions\n2. Generate a new token with write access\n3. Add token in Settings → Git\n\n**Or push manually:**\ncd ${dirHandle.name}\ngit push origin ${branch}`,
          pushed: false,
          needsManualPush: true,
          commitSha: commitSha.substring(0, 7),
        };
      }
      
      // Repository not found
      if (isNotFoundError) {
        return {
          success: true,
          message: `✅ Changes committed locally!\n\nCommit: ${commitSha.substring(0, 7)}\n\n❌ Push failed: Repository Not Found\n\nThe remote repository doesn't exist or you don't have access.\n\n**Check:**\n• Repository URL is correct: ${remoteUrl}\n• Repository hasn't been deleted\n• You have access to the repository\n\n**Push manually to verify:**\ncd ${dirHandle.name}\ngit push origin ${branch}`,
          pushed: false,
          needsManualPush: true,
          commitSha: commitSha.substring(0, 7),
        };
      }
      
      // Generic push failure with detailed error
      return {
        success: true,
        message: `✅ Changes committed locally!\n\nCommit: ${commitSha.substring(0, 7)}\n\n⚠️ Push failed: ${errorMessage}\n\n**Push manually:**\ncd ${dirHandle.name}\ngit push origin ${branch}\n\n💡 If this error persists, try:\n• Checking your token permissions\n• Verifying remote URL: ${remoteUrl}\n• Using terminal or GitHub Desktop`,
        pushed: false,
        needsManualPush: true,
        commitSha: commitSha.substring(0, 7),
      };
    }
  } catch (error) {
    console.error('[Git Publish] Unexpected error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return {
      success: false,
      message: 'Failed to publish changes',
      error: `❌ Publish failed: ${errorMsg}\n\n**What happened:**\nAn error occurred during the git operations (add, commit, or push).\n\n**Next steps:**\n1. Check the browser console for detailed error logs\n2. Verify your .git directory is not corrupted\n3. Make sure the file exists and has been saved\n4. Try refreshing the page and trying again\n\n**Need help?** Open browser console (F12) and look for [Git Publish] logs.`,
    };
  } finally {
    // Always reset the flag, even if an error occurred
    isPublishInProgress = false;
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

