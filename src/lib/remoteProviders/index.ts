import { GitHubProvider } from './github';
import { GitLabProvider } from './gitlab';
import type { IRemoteProvider, ProviderType } from './types';

export function createRemoteProvider(
  provider: ProviderType,
  token: string,
  baseUrl?: string
): IRemoteProvider {
  switch (provider) {
    case 'github':
      return new GitHubProvider(token);
    case 'gitlab':
      return new GitLabProvider(token, baseUrl);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export * from './types';
export { GitHubProvider } from './github';
export { GitLabProvider } from './gitlab';

