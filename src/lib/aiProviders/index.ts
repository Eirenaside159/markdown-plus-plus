/**
 * AI Providers - Main entry point
 * Factory and utility functions for AI providers
 */

import type { AIProviderType } from '../../types/ai-providers';
import type { AIProvider } from './types';
import { openAIProvider } from './openai';
import { geminiProvider } from './gemini';
import { claudeProvider } from './claude';

// Export all providers
export { openAIProvider } from './openai';
export { geminiProvider } from './gemini';
export { claudeProvider } from './claude';
export * from './types';

/**
 * Get provider instance by type
 */
export function getProvider(type: AIProviderType): AIProvider {
  switch (type) {
    case 'openai':
      return openAIProvider;
    case 'gemini':
      return geminiProvider;
    case 'claude':
      return claudeProvider;
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}

/**
 * Provider display names
 */
export const PROVIDER_NAMES: Record<AIProviderType, string> = {
  openai: 'OpenAI',
  gemini: 'Google Gemini',
  claude: 'Anthropic Claude',
};

/**
 * Provider descriptions
 */
export const PROVIDER_DESCRIPTIONS: Record<AIProviderType, string> = {
  openai: 'ChatGPT models including GPT-4 and GPT-3.5',
  gemini: 'Google\'s Gemini models with large context windows',
  claude: 'Anthropic\'s Claude models known for safety and accuracy',
};

/**
 * Provider documentation URLs
 */
export const PROVIDER_DOCS: Record<AIProviderType, string> = {
  openai: 'https://platform.openai.com/api-keys',
  gemini: 'https://makersuite.google.com/app/apikey',
  claude: 'https://console.anthropic.com/settings/keys',
};

/**
 * Validate if a provider type is supported
 */
export function isValidProvider(type: string): type is AIProviderType {
  return ['openai', 'gemini', 'claude'].includes(type);
}

