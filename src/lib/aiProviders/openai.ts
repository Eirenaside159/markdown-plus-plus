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

type OpenAIInvokeAPI = 'responses' | 'chat';

export class OpenAIProvider implements AIProvider {
  private modelToApiPreference: Map<string, OpenAIInvokeAPI> = new Map();

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

      // Build preference map and model list
      const allModels = (data.data || [])
        .map((m: any): AIModel => {
          const id: string = m.id;
          // Only use Responses API for o1/o3 reasoning models
          // Everything else (including GPT-4, GPT-5, etc.) uses Chat Completions
          const preferResponses: boolean = /^o1-/.test(id) || /^o3-/.test(id);
          this.modelToApiPreference.set(id, preferResponses ? 'responses' : 'chat');
          return {
            id,
            name: id,
            description: m.owned_by || undefined,
            contextWindow: m.context_window,
            maxTokens: m.max_tokens,
          };
        })
        .sort((a: any, b: any) => {
          // Sort alphabetically
          return a.id.localeCompare(b.id);
        });

      console.log('[OpenAI] Fetched models:', allModels.length, allModels.map(m => m.id));

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
   * Generate content using OpenAI
   */
  async generateContent(
    apiKey: string,
    request: AIGenerateRequest
  ): Promise<AIGenerateResponse> {
    try {
      const modelId = request.model;

      const generateViaResponses = async () => {
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        } as const;

        // Attempt 1: text.format as string 'json_object'
        let payload: any = {
          model: modelId,
          input: request.prompt,
          instructions: request.systemPrompt || CONTENT_GENERATION_SYSTEM_PROMPT,
          temperature: request.temperature ?? 0.7,
          max_output_tokens: request.maxTokens ?? 2000,
          text: { format: 'json_object' },
        };
        let resp = await fetch(`${OPENAI_API_URL}/responses`, {
          method: 'POST', headers, body: JSON.stringify(payload),
        });
        if (!resp.ok) {
          const err1 = await safeJson(resp);
          // Return error so caller can decide to fallback to Chat API
          return { ok: false as const, error: err1, data: null };
        }

        const data = await resp.json();
        const contentText =
          data.output_text ||
          data.output?.[0]?.content?.[0]?.text ||
          data.choices?.[0]?.message?.content ||
          null;
        return { ok: true as const, error: null, data, contentText };
      };

      const generateViaChat = async () => {
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        } as const;

        // Try with response_format first
        let payload: any = {
          model: modelId,
          messages: [
            { role: 'system', content: request.systemPrompt || CONTENT_GENERATION_SYSTEM_PROMPT },
            { role: 'user', content: request.prompt },
          ],
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 2000,
          response_format: { type: 'json_object' },
        };

        let resp = await fetch(`${OPENAI_API_URL}/chat/completions`, {
          method: 'POST', headers, body: JSON.stringify(payload),
        });

        // Handle errors and retry with different parameters
        if (!resp.ok) {
          const err = await safeJson(resp);
          const msg: string = err?.error?.message || '';
          console.log(`[OpenAI] Chat API error for ${modelId}:`, msg);
          
          // If max_tokens not supported, use max_completion_tokens instead
          if (msg.includes('max_tokens') && msg.includes('max_completion_tokens')) {
            console.log(`[OpenAI] Model ${modelId} requires max_completion_tokens instead of max_tokens`);
            payload.max_completion_tokens = payload.max_tokens;
            delete payload.max_tokens;
            
            resp = await fetch(`${OPENAI_API_URL}/chat/completions`, {
              method: 'POST', headers, body: JSON.stringify(payload),
            });
            if (!resp.ok) {
              const err2 = await safeJson(resp);
              const msg2: string = err2?.error?.message || '';
              console.log(`[OpenAI] Chat API error (max_completion_tokens) for ${modelId}:`, msg2);
              
              // If temperature not supported, remove it
              if (msg2.includes('temperature') && (msg2.includes('not support') || msg2.includes('Only the default'))) {
                console.log(`[OpenAI] Model ${modelId} doesn't support custom temperature, using default`);
                delete payload.temperature;
                
                resp = await fetch(`${OPENAI_API_URL}/chat/completions`, {
                  method: 'POST', headers, body: JSON.stringify(payload),
                });
                if (!resp.ok) {
                  const err3 = await safeJson(resp);
                  console.log(`[OpenAI] Chat API error (no temperature) for ${modelId}:`, err3?.error?.message || 'Unknown');
                  return { ok: false as const, error: err3 || err2 || err, data: null };
                }
              } else {
                return { ok: false as const, error: err2 || err, data: null };
              }
            }
          }
          // If response_format not supported, try without it
          else if (msg.includes('response_format') || msg.includes('Unsupported parameter')) {
            console.log(`[OpenAI] Model ${modelId} doesn't support response_format, retrying without it`);
            delete payload.response_format;
            resp = await fetch(`${OPENAI_API_URL}/chat/completions`, {
              method: 'POST', headers, body: JSON.stringify(payload),
            });
            if (!resp.ok) {
              const err2 = await safeJson(resp);
              console.log(`[OpenAI] Chat API error (no response_format) for ${modelId}:`, err2?.error?.message || 'Unknown');
              return { ok: false as const, error: err2 || err, data: null };
            }
          } else {
            return { ok: false as const, error: err, data: null };
          }
        }

        const data = await resp.json();
        const contentText = data.choices?.[0]?.message?.content || null;
        return { ok: true as const, error: null, data, contentText };
      };

      // Prefer API based on models response mapping; fallback to heuristic
      const preferred = this.modelToApiPreference.get(modelId);
      const preferResponses = preferred ? preferred === 'responses' : (/^o1-/.test(modelId) || /^o3-/.test(modelId));
      
      console.log(`[OpenAI] Generating with model: ${modelId}, using ${preferResponses ? 'Responses' : 'Chat'} API (cached: ${preferred || 'none'})`);
      
      let first = preferResponses ? generateViaResponses : generateViaChat;
      let second = preferResponses ? generateViaChat : generateViaResponses;

      let attempt = await first();

      // Only fallback between APIs if it's clearly the wrong API endpoint
      // (not parameter issues within the same API)
      if (!attempt.ok) {
        const msg: string = attempt.error?.error?.message || '';
        // Fallback only if Responses API complains about max_output_tokens not being supported
        // (meaning it should use Chat API with max_tokens/max_completion_tokens)
        const shouldFallback = 
          preferResponses && msg.includes('max_output_tokens') && msg.includes('not supported');
        
        if (shouldFallback) {
          console.log(`[OpenAI] Fallback from Responses to Chat for model ${modelId}`);
          attempt = await second();
        }
      }

      if (!attempt.ok) {
        return {
          success: false,
          error: attempt.error?.error?.message || 'Failed to generate content',
        };
      }

      const contentText = attempt.contentText;
      if (!contentText) {
        return { success: false, error: 'No content generated' };
      }

      const parsedContent = parseAIResponse(contentText);
      if (!parsedContent) {
        return { success: false, error: 'Failed to parse AI response' };
      }

      const d = attempt.data as any;
      return {
        success: true,
        data: parsedContent,
        usage: {
          promptTokens: d?.usage?.prompt_tokens || d?.usage?.input_tokens || 0,
          completionTokens: d?.usage?.completion_tokens || d?.usage?.output_tokens || 0,
          totalTokens:
            (d?.usage?.prompt_tokens || d?.usage?.input_tokens || 0) +
            (d?.usage?.completion_tokens || d?.usage?.output_tokens || 0),
        },
      };
    } catch (error) {
      return { success: false, error: handleAPIError(error) };
    }
  }
}

// Safe JSON parse helper
async function safeJson(resp: Response): Promise<any | null> {
  try {
    return await resp.json();
  } catch {
    return null;
  }
}

// Export singleton instance
export const openAIProvider = new OpenAIProvider();

