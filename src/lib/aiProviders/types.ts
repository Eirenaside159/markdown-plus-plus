/**
 * Common types and utilities for AI providers
 */

import type {
  AIGenerateRequest,
  AIGenerateResponse,
  AIGeneratedContent,
  ModelsResponse,
} from '../../types/ai-providers';

/**
 * Base interface that all AI providers must implement
 */
export interface AIProvider {
  /**
   * Fetch available models from the provider
   */
  fetchModels(apiKey: string): Promise<ModelsResponse>;

  /**
   * Generate content using the provider's API
   */
  generateContent(
    apiKey: string,
    request: AIGenerateRequest
  ): Promise<AIGenerateResponse>;

  /**
   * Validate API key format
   */
  validateApiKey(apiKey: string): boolean;

  /**
   * Test API connection
   */
  testConnection(apiKey: string): Promise<boolean>;
}

/**
 * System prompt for content generation
 */
export const CONTENT_GENERATION_SYSTEM_PROMPT = `You are a professional content writer. Generate high-quality markdown content based on the user's request.

Your response MUST be a valid JSON object with the following structure:
{
  "title": "Article Title",
  "meta": {
    "description": "Brief description",
    "tags": ["tag1", "tag2"],
    "category": "Category Name",
    "author": "Author Name",
    "excerpt": "Brief excerpt"
  },
  "content": "Start with a compelling opening paragraph that introduces the topic.\\n\\nContinue with well-structured content...\\n\\n## Section Heading\\n\\nMore content here..."
}

Guidelines:
- Create engaging, well-structured content
- The "title" field will be used as the main heading (H1), so NEVER use # (H1) in the content
- START the content with a regular paragraph (no heading), directly introducing the topic
- Use section headings (##, ###, etc.) AFTER the introduction to organize the content
- Use proper markdown formatting (headers from H2-H6, lists, bold, italic, code blocks, etc.)
- Generate appropriate meta tags based on content
- Keep descriptions concise (150-160 characters)
- Suggest 3-5 relevant tags
- Make content SEO-friendly and well-organized
- Return ONLY the JSON object, no additional text`;

/**
 * Parse AI response to extract JSON content
 */
export function parseAIResponse(text: string): AIGeneratedContent | null {
  try {
    // Try direct JSON parse
    const parsed = JSON.parse(text);
    
    // Validate structure
    if (!parsed.title || !parsed.content) {
      return null;
    }

    return {
      title: parsed.title,
      meta: parsed.meta || {},
      content: parsed.content,
    };
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.title && parsed.content) {
          return {
            title: parsed.title,
            meta: parsed.meta || {},
            content: parsed.content,
          };
        }
      } catch {
        // Continue to next attempt
      }
    }

    // Try to find JSON object in text
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        const parsed = JSON.parse(objectMatch[0]);
        if (parsed.title && parsed.content) {
          return {
            title: parsed.title,
            meta: parsed.meta || {},
            content: parsed.content,
          };
        }
      } catch {
        // Continue to next attempt
      }
    }

    return null;
  }
}

/**
 * Handle API errors gracefully
 */
export function handleAPIError(error: any): string {
  if (error.response) {
    // HTTP error
    const status = error.response.status;
    const message = error.response.data?.error?.message || error.response.statusText;

    switch (status) {
      case 401:
        return 'Invalid API key. Please check your credentials.';
      case 403:
        return 'Access forbidden. Please verify your API key permissions.';
      case 429:
        return 'Rate limit exceeded. Please try again later.';
      case 500:
      case 502:
      case 503:
        return 'Provider service error. Please try again later.';
      default:
        return `API error: ${message}`;
    }
  }

  if (error.message) {
    return error.message;
  }

  return 'An unknown error occurred';
}

