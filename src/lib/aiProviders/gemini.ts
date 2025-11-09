/**
 * Google Gemini Provider Implementation
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

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Gemini supported models
 */
const SUPPORTED_MODELS: AIModel[] = [
  {
    id: 'gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash (Experimental)',
    description: 'Latest experimental model with fast performance',
    contextWindow: 1000000,
    maxTokens: 8192,
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    description: 'Most capable model, best for complex tasks',
    contextWindow: 2000000,
    maxTokens: 8192,
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    description: 'Fast and efficient for most tasks',
    contextWindow: 1000000,
    maxTokens: 8192,
  },
  {
    id: 'gemini-1.5-flash-8b',
    name: 'Gemini 1.5 Flash-8B',
    description: 'Smallest and fastest for simple tasks',
    contextWindow: 1000000,
    maxTokens: 8192,
  },
];

export class GeminiProvider implements AIProvider {
  /**
   * Validate Gemini API key format
   */
  validateApiKey(apiKey: string): boolean {
    return apiKey.length > 20; // Gemini keys are typically 39 characters
  }

  /**
   * Test Gemini API connection
   */
  async testConnection(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${GEMINI_API_URL}/models?key=${apiKey}`,
        {
          method: 'GET',
        }
      );

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Fetch available models from Gemini
   */
  async fetchModels(apiKey: string): Promise<ModelsResponse> {
    try {
      const response = await fetch(
        `${GEMINI_API_URL}/models?key=${apiKey}`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error?.message || 'Failed to fetch models',
        };
      }

      const data = await response.json();
      
      // Filter for generateContent supported models
      const availableModelIds = new Set(
        data.models
          ?.filter((m: any) => 
            m.supportedGenerationMethods?.includes('generateContent')
          )
          .map((m: any) => m.name.replace('models/', ''))
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
   * Generate content using Gemini
   */
  async generateContent(
    apiKey: string,
    request: AIGenerateRequest
  ): Promise<AIGenerateResponse> {
    try {
      const response = await fetch(
        `${GEMINI_API_URL}/models/${request.model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `${request.systemPrompt || CONTENT_GENERATION_SYSTEM_PROMPT}\n\nUser Request: ${request.prompt}`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: request.temperature || 0.7,
              maxOutputTokens: request.maxTokens || 2000,
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error?.message || 'Failed to generate content',
        };
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

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

      // Gemini doesn't provide token usage in the same way
      const usage = {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
      };

      return {
        success: true,
        data: parsedContent,
        usage,
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
export const geminiProvider = new GeminiProvider();

