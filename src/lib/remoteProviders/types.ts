export type ProviderType = 'github' | 'gitlab';

export interface Repository {
  id: string | number;
  name: string;
  fullName: string;
  owner?: string; // GitHub için
  defaultBranch: string;
  private: boolean;
  url: string;
  provider: ProviderType;
  updatedAt: string;
  description?: string;
}

export interface RemoteFile {
  path: string;
  sha?: string; // GitHub için conflict detection
  id?: string; // GitLab için
  size?: number;
}

export interface FileContent {
  content: string;
  sha?: string;
  encoding?: string;
}

export interface CommitResult {
  sha: string;
  message: string;
  url?: string;
}

export interface IRemoteProvider {
  // Repository operations
  listRepositories(): Promise<Repository[]>;
  
  // Branch operations
  listBranches(repoId: string): Promise<string[]>;
  
  // File operations
  getMarkdownFiles(repoId: string, branch?: string): Promise<RemoteFile[]>;
  getFileContent(repoId: string, path: string, branch?: string): Promise<string>;
  
  // Modification operations
  updateFile(
    repoId: string,
    path: string,
    content: string,
    message: string,
    sha?: string,
    branch?: string
  ): Promise<CommitResult>;
  
  createFile(
    repoId: string,
    path: string,
    content: string,
    message: string,
    branch?: string
  ): Promise<CommitResult>;
  
  deleteFile(
    repoId: string,
    path: string,
    message: string,
    sha?: string,
    branch?: string
  ): Promise<boolean>;
  
  // Utility
  getRepoInfo(repoId: string): Promise<Repository>;
}

export class RemoteProviderError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public provider?: ProviderType
  ) {
    super(message);
    this.name = 'RemoteProviderError';
  }
}

