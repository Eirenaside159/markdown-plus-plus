/**
 * OpenAI Provider Implementation
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

const OPENAI_API_URL = 'https://api.openai.com/v1';

/**
 * OpenAI models that support chat completions
 */
const SUPPORTED_MODELS: AIModel[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Most advanced model, multimodal',
    contextWindow: 128000,
    maxTokens: 4096,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Faster and more affordable',
    contextWindow: 128000,
    maxTokens: 16384,
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    description: 'High-intelligence model',
    contextWindow: 128000,
    maxTokens: 4096,
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    description: 'Previous generation high-intelligence',
    contextWindow: 8192,
    maxTokens: 4096,
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    description: 'Fast and economical',
    contextWindow: 16385,
    maxTokens: 4096,
  },
];

export class OpenAIProvider implements AIProvider {
  /**
   * Validate OpenAI API key format
   */
  validateApiKey(apiKey: string): boolean {
    return apiKey.startsWith('sk-') && apiKey.length > 20;
  }

  /**
   * Test OpenAI API connection
   */
  async testConnection(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${OPENAI_API_URL}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Fetch available models from OpenAI
   */
  async fetchModels(apiKey: string): Promise<ModelsResponse> {
    try {
      const response = await fetch(`${OPENAI_API_URL}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error?.message || 'Failed to fetch models',
        };
      }

      const data = await response.json();
      
      // Filter for supported chat models
      const availableModelIds = new Set(
        data.data.map((m: any) => m.id)
      );

      const models = SUPPORTED_MODELS.filter(model =>
        availableModelIds.has(model.id)
      );

      return {
        success: true,
        models: models.length > 0 ? models : SUPPORTED_MODELS,
      };
    } catch (error) {
      return {
        success: false,
        error: handleAPIError(error),
      };
    }
  }

  /**
   * Generate content using OpenAI
   */
  async generateContent(
    apiKey: string,
    request: AIGenerateRequest
  ): Promise<AIGenerateResponse> {
    try {
      const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: request.model,
          messages: [
            {
              role: 'system',
              content: request.systemPrompt || CONTENT_GENERATION_SYSTEM_PROMPT,
            },
            {
              role: 'user',
              content: request.prompt,
            },
          ],
          temperature: request.temperature || 0.7,
          max_tokens: request.maxTokens || 2000,
          response_format: { type: 'json_object' },
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
      const content = data.choices[0]?.message?.content;

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
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
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
export const openAIProvider = new OpenAIProvider();

