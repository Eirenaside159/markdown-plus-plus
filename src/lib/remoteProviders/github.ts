import type {
  IRemoteProvider,
  Repository,
  RemoteFile,
  CommitResult,
} from './types';
import { RemoteProviderError } from './types';

export class GitHubProvider implements IRemoteProvider {
  private baseUrl = 'https://api.github.com';

  constructor(private token: string) {
    if (!token) {
      throw new Error('GitHub token is required');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      
      throw new RemoteProviderError(
        error.message || `GitHub API error: ${response.statusText}`,
        error.code || 'GITHUB_API_ERROR',
        response.status,
        'github'
      );
    }

    // Handle raw content responses
    if (options.headers?.['Accept'] === 'application/vnd.github.raw') {
      return (await response.text()) as T;
    }

    return await response.json();
  }

  async listRepositories(): Promise<Repository[]> {
    const repos = await this.request<any[]>(
      '/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator'
    );

    return repos.map((repo) => ({
      id: repo.full_name, // owner/repo format
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner.login,
      defaultBranch: repo.default_branch || 'main',
      private: repo.private,
      url: repo.html_url,
      provider: 'github' as const,
      updatedAt: repo.updated_at,
      description: repo.description,
    }));
  }

  async listBranches(repoId: string): Promise<string[]> {
    const branches = await this.request<any[]>(`/repos/${repoId}/branches`);
    return branches.map((b) => b.name);
  }

  async getMarkdownFiles(
    repoId: string,
    branch = 'main'
  ): Promise<RemoteFile[]> {
    try {
      // Get the tree recursively
      const data = await this.request<any>(
        `/repos/${repoId}/git/trees/${branch}?recursive=1`
      );

      if (!data.tree || !Array.isArray(data.tree)) {
        return [];
      }

      // Check if tree was truncated (too many files)
      if (data.truncated) {
        console.warn('GitHub tree API: Response was truncated due to large repository size');
      }

      console.log(`[GitHub] Found ${data.tree.length} total items${data.truncated ? ' (truncated)' : ''}`);

      const markdownFiles = data.tree
        .filter(
          (item: any) =>
            item.path.endsWith('.md') &&
            item.type === 'blob' &&
            // Exclude common non-content directories
            !item.path.startsWith('node_modules/') &&
            !item.path.startsWith('.git/')
        )
        .map((item: any) => ({
          path: item.path,
          sha: item.sha,
          size: item.size,
        }));

      console.log(`[GitHub] ✅ Found ${markdownFiles.length} markdown files`);
      
      // Show sample paths
      if (markdownFiles.length > 0) {
        console.log(`[GitHub] Sample files:`, markdownFiles.slice(0, 3).map(f => f.path));
      }

      return markdownFiles;
    } catch (error) {
      if (error instanceof RemoteProviderError && error.statusCode === 404) {
        // Branch doesn't exist or repo is empty
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
      const content = await this.request<string>(
        `/repos/${repoId}/contents/${encodeURIComponent(path)}?ref=${branch}`,
        {
          headers: {
            Accept: 'application/vnd.github.raw',
          },
        }
      );

      return content;
    } catch (error) {
      if (error instanceof RemoteProviderError && error.statusCode === 404) {
        throw new RemoteProviderError(
          `File not found: ${path}`,
          'FILE_NOT_FOUND',
          404,
          'github'
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
    sha?: string,
    branch = 'main'
  ): Promise<CommitResult> {
    if (!sha) {
      throw new RemoteProviderError(
        'SHA is required to update a file on GitHub',
        'SHA_REQUIRED',
        undefined,
        'github'
      );
    }

    const result = await this.request<any>(
      `/repos/${repoId}/contents/${encodeURIComponent(path)}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          content: this.encodeBase64(content),
          sha,
          branch,
        }),
      }
    );

    return {
      sha: result.commit.sha,
      message: result.commit.message,
      url: result.commit.html_url,
    };
  }

  async createFile(
    repoId: string,
    path: string,
    content: string,
    message: string,
    branch = 'main'
  ): Promise<CommitResult> {
    const result = await this.request<any>(
      `/repos/${repoId}/contents/${encodeURIComponent(path)}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          content: this.encodeBase64(content),
          branch,
        }),
      }
    );

    return {
      sha: result.commit.sha,
      message: result.commit.message,
      url: result.commit.html_url,
    };
  }

  async deleteFile(
    repoId: string,
    path: string,
    message: string,
    sha?: string,
    branch = 'main'
  ): Promise<boolean> {
    if (!sha) {
      throw new RemoteProviderError(
        'SHA is required to delete a file on GitHub',
        'SHA_REQUIRED',
        undefined,
        'github'
      );
    }

    await this.request(
      `/repos/${repoId}/contents/${encodeURIComponent(path)}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          sha,
          branch,
        }),
      }
    );

    return true;
  }

  async getRepoInfo(repoId: string): Promise<Repository> {
    const repo = await this.request<any>(`/repos/${repoId}`);

    return {
      id: repo.full_name,
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner.login,
      defaultBranch: repo.default_branch || 'main',
      private: repo.private,
      url: repo.html_url,
      provider: 'github',
      updatedAt: repo.updated_at,
      description: repo.description,
    };
  }

  private encodeBase64(str: string): string {
    // Handle UTF-8 properly
    return btoa(unescape(encodeURIComponent(str)));
  }
}

