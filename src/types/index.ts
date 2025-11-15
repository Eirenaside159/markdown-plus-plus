export interface MarkdownFile {
  name: string;
  path: string;
  content: string;
  frontmatter: FrontMatter;
  rawContent: string;
}

export interface FrontMatter {
  title?: string;
  date?: string | Date; // gray-matter can parse dates as Date objects
  categories?: string[];
  tags?: string[];
  author?: string;
  description?: string;
  [key: string]: unknown;
}

export interface FileTreeItem {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileTreeItem[];
}

// Workspace types
export type WorkspaceType = 'local' | 'remote';

export interface RemoteWorkspace {
  provider: 'github' | 'gitlab';
  token: string;
  repository: {
    id: string;
    name: string;
    fullName: string;
    owner?: string; // GitHub
    branch: string;
    defaultBranch: string;
    url: string;
  };
  // Cache for file metadata (SHA values for conflict detection)
  fileMetadata: Map<string, {
    sha?: string;
    lastFetched: number;
  }>;
}

export interface Workspace {
  type: WorkspaceType;
  
  // Local workspace
  dirHandle?: FileSystemDirectoryHandle;
  
  // Remote workspace
  remote?: RemoteWorkspace;
}

// Export AI types
export * from './ai-providers';

