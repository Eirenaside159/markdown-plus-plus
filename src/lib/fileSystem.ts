import type { FileTreeItem } from '@/types';

/**
 * Gitignore patterns based on common .gitignore rules
 */
const IGNORE_PATTERNS = [
  // Dependencies
  'node_modules',
  'bower_components',
  'jspm_packages',
  'vendor',
  '.pnp',
  '.pnp.js',
  '.yarn',
  '.pnpm-store',
  
  // Build outputs
  'dist',
  'dist-ssr',
  'build',
  '*.local',
  
  // Environment variables
  '.env',
  '.env.local',
  '.env.development.local',
  '.env.test.local',
  '.env.production.local',
  
  // Logs
  'logs',
  '*.log',
  'npm-debug.log*',
  'yarn-debug.log*',
  'yarn-error.log*',
  'pnpm-debug.log*',
  'lerna-debug.log*',
  
  // Testing
  'coverage',
  '*.lcov',
  '.nyc_output',
  
  // Sample/Demo files
  'sample-docs',
  'demo',
  'examples',
  
  // Editor directories and files
  '.vscode',
  '.idea',
  '.fleet',
  '.cursor',
  '.vscode-test',
  '*.swp',
  '*.swo',
  '*.swn',
  '*.suo',
  '*.ntvs*',
  '*.njsproj',
  '*.sln',
  
  // OS files
  '.DS_Store',
  '.DS_Store?',
  '._*',
  '.Spotlight-V100',
  '.Trashes',
  'ehthumbs.db',
  'Thumbs.db',
  'Desktop.ini',
  
  // Temp files
  '*.tmp',
  '*.temp',
  '.cache',
  '.parcel-cache',
  '.eslintcache',
  
  // Optional npm cache directory
  '.npm',
  
  // Optional REPL history
  '.node_repl_history',
  
  // TypeScript cache
  '*.tsbuildinfo',
  
  // Vite
  '.vite',
  
  // Git directory
  '.git',
];

/**
 * Convert a gitignore pattern to a regex pattern
 */
function patternToRegex(pattern: string): RegExp {
  // Remove trailing slash
  pattern = pattern.replace(/\/$/, '');
  
  // Escape special regex characters except * and ?
  let regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    // Convert gitignore wildcards to regex
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  
  return new RegExp(`^${regexPattern}$`);
}

/**
 * Check if a filename matches a gitignore pattern
 */
function matchesPattern(name: string, pattern: string): boolean {
  // Exact match
  if (name === pattern || name === pattern.replace(/\/$/, '')) {
    return true;
  }
  
  // Pattern with wildcards
  if (pattern.includes('*') || pattern.includes('?')) {
    const regex = patternToRegex(pattern);
    return regex.test(name);
  }
  
  return false;
}

/**
 * Check if a path should be ignored based on .gitignore patterns
 */
function shouldIgnorePath(name: string, path: string): boolean {
  // Check the name itself against all patterns
  for (const pattern of IGNORE_PATTERNS) {
    if (matchesPattern(name, pattern)) {
      return true;
    }
  }
  
  // Check if any part of the path matches ignore patterns
  const pathParts = path.split('/');
  for (const part of pathParts) {
    for (const pattern of IGNORE_PATTERNS) {
      if (matchesPattern(part, pattern)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check if File System Access API is supported
 */
export function isFileSystemAccessSupported(): boolean {
  return 'showDirectoryPicker' in window;
}

export async function selectDirectory(): Promise<FileSystemDirectoryHandle | null> {
  try {
    // Check if the API is supported
    if (!isFileSystemAccessSupported()) {
      throw new Error('File System Access API is not supported in this browser');
    }
    
    const dirHandle = await window.showDirectoryPicker({
      mode: 'readwrite',
    });
    return dirHandle;
  } catch (err) {
    return null;
  }
}

export async function readDirectory(
  dirHandle: FileSystemDirectoryHandle,
  path = ''
): Promise<FileTreeItem[]> {
  const items: FileTreeItem[] = [];

  for await (const entry of dirHandle.values()) {
    const itemPath = path ? `${path}/${entry.name}` : entry.name;

    // Skip ignored paths
    if (shouldIgnorePath(entry.name, itemPath)) {
      continue;
    }

    if (entry.kind === 'directory') {
      const subDirHandle = await dirHandle.getDirectoryHandle(entry.name);
      const children = await readDirectory(subDirHandle, itemPath);
      // Only include directory if it has markdown files
      if (children.length > 0) {
        items.push({
          name: entry.name,
          path: itemPath,
          isDirectory: true,
          children,
        });
      }
    } else if (entry.kind === 'file' && entry.name.endsWith('.md')) {
      items.push({
        name: entry.name,
        path: itemPath,
        isDirectory: false,
      });
    }
  }

  return items.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
}

export async function readFile(
  dirHandle: FileSystemDirectoryHandle,
  filePath: string
): Promise<string> {
  const parts = filePath.split('/');
  let currentHandle: FileSystemDirectoryHandle | FileSystemFileHandle = dirHandle;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i === parts.length - 1) {
      // Last part - this is the file
      const fileHandle = await (currentHandle as FileSystemDirectoryHandle).getFileHandle(part);
      const file = await fileHandle.getFile();
      return await file.text();
    } else {
      // Directory
      currentHandle = await (currentHandle as FileSystemDirectoryHandle).getDirectoryHandle(part);
    }
  }

  throw new Error('Invalid file path');
}

export async function writeFile(
  dirHandle: FileSystemDirectoryHandle,
  filePath: string,
  content: string
): Promise<void> {
  const parts = filePath.split('/');
  let currentHandle: FileSystemDirectoryHandle = dirHandle;

  for (let i = 0; i < parts.length - 1; i++) {
    currentHandle = await currentHandle.getDirectoryHandle(parts[i]);
  }

  const fileName = parts[parts.length - 1];
  const fileHandle = await currentHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function deleteFile(
  dirHandle: FileSystemDirectoryHandle,
  filePath: string
): Promise<void> {
  const parts = filePath.split('/');
  let currentHandle: FileSystemDirectoryHandle = dirHandle;

  for (let i = 0; i < parts.length - 1; i++) {
    currentHandle = await currentHandle.getDirectoryHandle(parts[i]);
  }

  const fileName = parts[parts.length - 1];
  await currentHandle.removeEntry(fileName);
}

