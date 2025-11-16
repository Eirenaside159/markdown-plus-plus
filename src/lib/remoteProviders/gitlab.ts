import type {
  IRemoteProvider,
  Repository,
  RemoteFile,
  CommitResult,
} from './types';
import { RemoteProviderError } from './types';

export class GitLabProvider implements IRemoteProvider {
  private baseUrl: string;

  constructor(
    private token: string,
    baseUrl = 'https://gitlab.com/api/v4'
  ) {
    if (!token) {
      throw new Error('GitLab token is required');
    }
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // GitLab supports two token formats:
    // 1. Personal Access Token: Use PRIVATE-TOKEN header (starts with 'glpat-' or is a long hex string)
    // 2. OAuth Access Token: Use Authorization Bearer header (typically shorter hex string from OAuth)
    // OAuth tokens are usually 64 characters or less, Personal Access Tokens are usually longer
    // We'll use Bearer for OAuth tokens and PRIVATE-TOKEN for PATs
    const isOAuthToken = !this.token.startsWith('glpat-') && this.token.length <= 64;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(isOAuthToken 
        ? { 'Authorization': `Bearer ${this.token}` }
        : { 'PRIVATE-TOKEN': this.token }),
      ...(options.headers as Record<string, string> || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));

      // Provide helpful error messages based on status code
      let errorMessage = error.message || error.error_description || `GitLab API error: ${response.statusText}`;
      
      if (response.status === 401) {
        errorMessage = 'Invalid token. Please check your Personal Access Token.';
      } else if (response.status === 403) {
        errorMessage = 'Access denied. Make sure your token has the correct scopes:\n\n' +
          '✅ Required: api, read_user, read_repository, write_repository\n\n' +
          'To fix:\n' +
          '1. Go to https://gitlab.com/-/user_settings/personal_access_tokens\n' +
          '2. Create a new token with all required scopes\n' +
          '3. Try again with the new token';
      } else if (response.status === 404) {
        errorMessage = 'GitLab API endpoint not found. Are you using a self-hosted GitLab instance?';
      }

      throw new RemoteProviderError(
        errorMessage,
        error.error || 'GITLAB_API_ERROR',
        response.status,
        'gitlab'
      );
    }

    // Handle raw content
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('text/plain') || contentType?.includes('text/markdown')) {
      return (await response.text()) as T;
    }

    return await response.json();
  }

  async listRepositories(): Promise<Repository[]> {
    const projects = await this.request<any[]>(
      '/projects?membership=true&per_page=100&order_by=updated_at&simple=true'
    );

    return projects.map((project) => ({
      id: String(project.id),
      name: project.name,
      fullName: project.path_with_namespace,
      defaultBranch: project.default_branch || 'main',
      private: project.visibility === 'private',
      url: project.web_url,
      provider: 'gitlab' as const,
      updatedAt: project.last_activity_at,
      description: project.description,
    }));
  }

  async listBranches(repoId: string): Promise<string[]> {
    const projectId = encodeURIComponent(repoId);
    const branches = await this.request<any[]>(
      `/projects/${projectId}/repository/branches`
    );
    return branches.map((b) => b.name);
  }

  async getMarkdownFiles(
    repoId: string,
    branch = 'main'
  ): Promise<RemoteFile[]> {
    try {
      const projectId = encodeURIComponent(repoId);
      
      // GitLab API pagination - collect all pages
      let allFiles: any[] = [];
      let page = 1;
      const perPage = 100;
      
      while (true) {
        const tree = await this.request<any[]>(
          `/projects/${projectId}/repository/tree?recursive=true&ref=${branch}&per_page=${perPage}&page=${page}`
        );

        if (!Array.isArray(tree) || tree.length === 0) {
          break;
        }

        allFiles = allFiles.concat(tree);
        
        // If we got less than perPage items, we're on the last page
        if (tree.length < perPage) {
          break;
        }
        
        page++;
        
        // Safety limit to prevent infinite loop
        if (page > 50) {
          console.warn('GitLab tree API: Hit pagination safety limit (50 pages)');
          break;
        }
      }

      console.log(`[GitLab] Found ${allFiles.length} total items (${page} page${page > 1 ? 's' : ''})`);
      
      // Debug: Show all file types
      const filesByType = allFiles.reduce((acc: any, item: any) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      }, {});
      console.log(`[GitLab] File types:`, filesByType);

      const markdownFiles = allFiles
        .filter(
          (item: any) =>
            item.path.endsWith('.md') &&
            item.type === 'blob' &&
            !item.path.startsWith('node_modules/') &&
            !item.path.startsWith('.git/')
        )
        .map((item: any) => ({
          path: item.path,
          id: item.id,
        }));

      console.log(`[GitLab] ✅ Found ${markdownFiles.length} markdown files`);
      
      // Debug: Show sample paths (only first 3 to avoid spam)
      if (markdownFiles.length > 0) {
        console.log(`[GitLab] Sample files:`, markdownFiles.slice(0, 3).map(f => f.path));
      }

      return markdownFiles;
    } catch (error) {
      if (error instanceof RemoteProviderError && error.statusCode === 404) {
        return [];
      }
      throw error;
    }
  }

  async getFileContent(
    repoId: string,
    path: string,
    branch = 'main'
  ): Promise<string> {
    try {
      const projectId = encodeURIComponent(repoId);
      const filePath = encodeURIComponent(path);
      
      const content = await this.request<string>(
        `/projects/${projectId}/repository/files/${filePath}/raw?ref=${branch}`
      );

      return content;
    } catch (error) {
      if (error instanceof RemoteProviderError && error.statusCode === 404) {
        throw new RemoteProviderError(
          `File not found: ${path}`,
          'FILE_NOT_FOUND',
          404,
          'gitlab'
        );
      }
      throw error;
    }
  }

  async updateFile(
    repoId: string,
    path: string,
    content: string,
    message: string,
    _sha?: string, // GitLab doesn't use SHA for updates
    branch = 'main'
  ): Promise<CommitResult> {
    const projectId = encodeURIComponent(repoId);
    const filePath = encodeURIComponent(path);

    try {
      const result = await this.request<any>(
        `/projects/${projectId}/repository/files/${filePath}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            branch,
            content,
            commit_message: message,
          }),
        }
      );

      return {
        sha: result.file_path, // GitLab doesn't return SHA in the same way
        message: message,
      };
    } catch (error: any) {
      // If we get "A file with this name already exists", it means we should use update not create
      // This shouldn't happen, but if it does, provide better error message
      if (error.message?.includes('already exists')) {
        throw new RemoteProviderError(
          `File update failed. The file might have been modified externally. Please refresh and try again.`,
          'FILE_CONFLICT',
          error.statusCode,
          'gitlab'
        );
      }
      throw error;
    }
  }

  async createFile(
    repoId: string,
    path: string,
    content: string,
    message: string,
    branch = 'main'
  ): Promise<CommitResult> {
    const projectId = encodeURIComponent(repoId);
    const filePath = encodeURIComponent(path);

    try {
      const result = await this.request<any>(
        `/projects/${projectId}/repository/files/${filePath}`,
        {
          method: 'POST',
          body: JSON.stringify({
            branch,
            content,
            commit_message: message,
          }),
        }
      );

      return {
        sha: result.file_path,
        message: message,
      };
    } catch (error: any) {
      // If file already exists, we should have used update instead
      if (error.message?.includes('already exists') || error.statusCode === 400) {
        throw new RemoteProviderError(
          `File already exists: ${path}. This is likely a bug - the file should have been updated, not created.`,
          'FILE_EXISTS',
          400,
          'gitlab'
        );
      }
      throw error;
    }
  }

  async deleteFile(
    repoId: string,
    path: string,
    message: string,
    _sha?: string,
    branch = 'main'
  ): Promise<boolean> {
    const projectId = encodeURIComponent(repoId);
    const filePath = encodeURIComponent(path);

    await this.request(
      `/projects/${projectId}/repository/files/${filePath}`,
      {
        method: 'DELETE',
        body: JSON.stringify({
          branch,
          commit_message: message,
        }),
      }
    );

    return true;
  }

  async getRepoInfo(repoId: string): Promise<Repository> {
    const projectId = encodeURIComponent(repoId);
    const project = await this.request<any>(`/projects/${projectId}`);

    return {
      id: String(project.id),
      name: project.name,
      fullName: project.path_with_namespace,
      defaultBranch: project.default_branch || 'main',
      private: project.visibility === 'private',
      url: project.web_url,
      provider: 'gitlab',
      updatedAt: project.last_activity_at,
      description: project.description,
    };
  }
}

