/**
 * AI Provider Types and Interfaces
 * Defines types for OpenAI, Gemini, and Claude integrations
 */

// Supported AI providers
export type AIProviderType = 'openai' | 'gemini' | 'claude';

// Model information
export interface AIModel {
  id: string;
  name: string;
  description?: string;
  contextWindow?: number;
  maxTokens?: number;
}

// Provider configuration
export interface AIProviderConfig {
  type: AIProviderType;
  enabled: boolean;
  apiKey: string;
  defaultModel?: string;
  availableModels: AIModel[];
}

// All AI settings
export interface AISettings {
  providers: {
    openai?: AIProviderConfig;
    gemini?: AIProviderConfig;
    claude?: AIProviderConfig;
  };
  lastUsedProvider?: AIProviderType;
  lastUsedModel?: string;
}

// AI generation request
export interface AIGenerateRequest {
  provider: AIProviderType;
  model: string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

// AI generated content response
export interface AIGeneratedContent {
  title: string;
  meta: {
    description?: string;
    tags?: string[];
    category?: string;
    author?: string;
    excerpt?: string;
    [key: string]: any; // Allow custom meta fields
  };
  content: string; // Markdown content
}

// API response wrapper
export interface AIGenerateResponse {
  success: boolean;
  data?: AIGeneratedContent;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Provider capability check
export interface AIProviderCapability {
  available: boolean;
  error?: string;
}

// Model fetch response
export interface ModelsResponse {
  success: boolean;
  models?: AIModel[];
  error?: string;
}

