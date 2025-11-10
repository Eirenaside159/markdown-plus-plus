/**
 * Anthropic Claude Provider Implementation
 */

import type {
  AIGenerateRequest,
  AIGenerateResponse,
  AIModel,
  ModelsResponse,
} from '../../types/ai-providers';
import type {
  AIProvider,
} from './types';
import {
  CONTENT_GENERATION_SYSTEM_PROMPT,
  parseAIResponse,
  handleAPIError,
} from './types';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1';
const ANTHROPIC_VERSION = '2023-06-01';

/**
 * Claude supported models (as of November 2024)
 * Note: Claude API doesn't provide a models listing endpoint
 * Users can manually enter any model ID if needed
 */
const SUPPORTED_MODELS: AIModel[] = [
  // Claude 3.5 Series
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'claude-3-5-sonnet-20241022',
    contextWindow: 200000,
    maxTokens: 8192,
  },
  {
    id: 'claude-3-5-sonnet-20240620',
    name: 'claude-3-5-sonnet-20240620',
    contextWindow: 200000,
    maxTokens: 8192,
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'claude-3-5-haiku-20241022',
    contextWindow: 200000,
    maxTokens: 8192,
  },
  // Claude 3 Series
  {
    id: 'claude-3-opus-20240229',
    name: 'claude-3-opus-20240229',
    contextWindow: 200000,
    maxTokens: 4096,
  },
  {
    id: 'claude-3-sonnet-20240229',
    name: 'claude-3-sonnet-20240229',
    contextWindow: 200000,
    maxTokens: 4096,
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'claude-3-haiku-20240307',
    contextWindow: 200000,
    maxTokens: 4096,
  },
  // Older versions (if user has access)
  {
    id: 'claude-2.1',
    name: 'claude-2.1',
    contextWindow: 200000,
    maxTokens: 4096,
  },
  {
    id: 'claude-2.0',
    name: 'claude-2.0',
    contextWindow: 100000,
    maxTokens: 4096,
  },
  {
    id: 'claude-instant-1.2',
    name: 'claude-instant-1.2',
    contextWindow: 100000,
    maxTokens: 4096,
  },
];

export class ClaudeProvider implements AIProvider {
  /**
   * Validate Claude API key format
   */
  validateApiKey(apiKey: string): boolean {
    return apiKey.startsWith('sk-ant-') && apiKey.length > 20;
  }

  /**
   * Test Claude API connection
   */
  async testConnection(apiKey: string): Promise<boolean> {
    try {
      // Claude doesn't have a simple endpoint to test, so we make a minimal request
      const response = await fetch(`${CLAUDE_API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }],
        }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Fetch available models from Claude
   */
  async fetchModels(_apiKey: string): Promise<ModelsResponse> {
    // Claude doesn't have a models endpoint, so we return our predefined list
    console.log('[Claude] Using predefined models:', SUPPORTED_MODELS.length, SUPPORTED_MODELS.map(m => m.id));
    
    return {
      success: true,
      models: SUPPORTED_MODELS,
    };
  }

  /**
   * Generate content using Claude
   */
  async generateContent(
    apiKey: string,
    request: AIGenerateRequest
  ): Promise<AIGenerateResponse> {
    try {
      const response = await fetch(`${CLAUDE_API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: request.model,
          max_tokens: request.maxTokens || 2000,
          temperature: request.temperature || 0.7,
          system: request.systemPrompt || CONTENT_GENERATION_SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: request.prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error?.message || 'Failed to generate content',
        };
      }

      const data = await response.json();
      const content = data.content?.[0]?.text;

      if (!content) {
        return {
          success: false,
          error: 'No content generated',
        };
      }

      const parsedContent = parseAIResponse(content);

      if (!parsedContent) {
        return {
          success: false,
          error: 'Failed to parse AI response',
        };
      }

      return {
        success: true,
        data: parsedContent,
        usage: {
          promptTokens: data.usage?.input_tokens || 0,
          completionTokens: data.usage?.output_tokens || 0,
          totalTokens:
            (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: handleAPIError(error),
      };
    }
  }
}

// Export singleton instance
export const claudeProvider = new ClaudeProvider();

