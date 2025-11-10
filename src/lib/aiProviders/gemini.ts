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
      
      // Get ALL models from API - no filtering at all
      const allModels = (data.models || [])
        .map((m: any): AIModel => {
          const modelId = m.name.replace('models/', '');
          return {
            id: modelId,
            name: modelId, // Keep original ID
            description: m.displayName || undefined,
          };
        })
        .sort((a: any, b: any) => {
          // Sort alphabetically
          return a.id.localeCompare(b.id);
        });

      console.log('[Gemini] Fetched models:', allModels.length, allModels.map(m => m.id));

      if (allModels.length === 0) {
        return {
          success: false,
          error: 'No models found in your account',
        };
      }

      return {
        success: true,
        models: allModels,
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

