/**
 * AI Generator Modal Component
 * Allows users to generate content using configured AI providers
 */

import { useState, useEffect } from 'react';
import { Sparkles, Loader2, AlertCircle, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { getEnabledProviders, getProviderConfig, setLastUsed } from '@/lib/aiSettings';
import { getProvider, PROVIDER_NAMES } from '@/lib/aiProviders';
import type { AIProviderType, AIGeneratedContent } from '@/types/ai-providers';

interface AIGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (content: AIGeneratedContent) => void;
}

export function AIGeneratorModal({ isOpen, onClose, onGenerate }: AIGeneratorModalProps) {
  const [enabledProviders, setEnabledProviders] = useState<AIProviderType[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<AIProviderType | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string }>>([]);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [generatedContent, setGeneratedContent] = useState<AIGeneratedContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load enabled providers and set default
  useEffect(() => {
    if (isOpen) {
      loadProviders();
    }
  }, [isOpen]);

  // Update model when provider changes
  useEffect(() => {
    if (selectedProvider) {
      loadProviderModel(selectedProvider);
    }
  }, [selectedProvider]);

  const loadProviders = async () => {
    const providers = await getEnabledProviders();
    setEnabledProviders(providers);

    if (providers.length > 0 && !selectedProvider) {
      setSelectedProvider(providers[0]);
    }
  };

  const loadProviderModel = async (provider: AIProviderType) => {
    const config = await getProviderConfig(provider);
    if (config) {
      setAvailableModels(config.availableModels);
      if (config.defaultModel) {
        setSelectedModel(config.defaultModel);
      } else if (config.availableModels.length) {
        setSelectedModel(config.availableModels[0].id);
      }
    }
  };

  const handleGenerate = async () => {
    if (!selectedProvider || !selectedModel || !prompt.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsGenerating(true);
    setGenerationStatus('generating');
    setError(null);

    try {
      const config = await getProviderConfig(selectedProvider);
      if (!config?.apiKey) {
        throw new Error('API key not found');
      }

      const provider = getProvider(selectedProvider);
      const response = await provider.generateContent(config.apiKey, {
        provider: selectedProvider,
        model: selectedModel,
        prompt: prompt.trim(),
      });

      if (response.success && response.data) {
        setGeneratedContent(response.data);
        setGenerationStatus('success');
        
        // Save last used provider and model
        await setLastUsed(selectedProvider, selectedModel);

        toast.success('Content generated successfully!');
      } else {
        setError(response.error || 'Failed to generate content');
        setGenerationStatus('error');
        toast.error(response.error || 'Failed to generate content');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'An unexpected error occurred';
      setError(errorMessage);
      setGenerationStatus('error');
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInsert = () => {
    if (generatedContent) {
      onGenerate(generatedContent);
      handleClose();
    }
  };

  const handleClose = () => {
    setPrompt('');
    setGeneratedContent(null);
    setGenerationStatus('idle');
    setError(null);
    onClose();
  };

  const handleTryAgain = () => {
    setGeneratedContent(null);
    setGenerationStatus('idle');
    setError(null);
  };

  const handleGoToSettings = () => {
    try {
      // Navigate to Settings → AI: update history state and hash
      const url = '#settings?tab=ai';
      window.history.pushState({ viewMode: 'settings' }, '', url);
      // Notify App (viewMode) and Settings (activeTab)
      window.dispatchEvent(new PopStateEvent('popstate', { state: { viewMode: 'settings' } } as any));
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (e) {
      // Fallback: just change hash
      window.location.hash = '#settings?tab=ai';
    }
    // Close modal after navigating
    handleClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isGenerating) {
      handleClose();
    }
  };

  // ESC key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isGenerating) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, isGenerating]);

  if (!isOpen) return null;

  // No providers configured
  if (enabledProviders.length === 0) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4"
        onClick={handleBackdropClick}
      >
        <div 
          className="bg-background rounded-lg shadow-xl w-full max-w-lg border"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Writer
            </h2>
            <button
              onClick={handleClose}
              className="h-8 w-8 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors inline-flex items-center justify-center shrink-0"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <div className="space-y-2">
              <h3 className="text-base font-semibold">No AI Providers Configured</h3>
              <p className="text-sm text-muted-foreground">
                Please configure at least one AI provider in Settings → AI to use this feature.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleGoToSettings}
                className="h-10 px-4 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors inline-flex items-center justify-center"
              >
                Open Settings
              </button>
              <button
                onClick={handleClose}
                className="h-10 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center justify-center"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b">
          <div className="flex-1">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Writer
            </h2>
            <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
              Generate blog posts, articles, and content using AI
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isGenerating}
            className="h-8 w-8 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
          {/* Provider and Model Selection */}
          {(generationStatus === 'idle' || generationStatus === 'generating' || generationStatus === 'error') && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Provider Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">AI Provider</label>
                  <Select
                    value={selectedProvider || ''}
                    onValueChange={(value) => setSelectedProvider(value as AIProviderType)}
                    disabled={isGenerating}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {enabledProviders.map((provider) => (
                        <SelectItem key={provider} value={provider}>
                          {PROVIDER_NAMES[provider]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Model Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Model</label>
                  <Select
                    value={selectedModel}
                    onValueChange={setSelectedModel}
                    disabled={isGenerating || !selectedProvider || availableModels.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={availableModels.length === 0 ? "No models available" : "Select model"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Prompt Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  What would you like to write about?
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isGenerating}
                  placeholder="E.g., 'Write a blog post about the benefits of using TypeScript in modern web development'"
                  className="w-full min-h-[120px] px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-y disabled:opacity-50"
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  Be specific about the topic, tone, and any requirements you have.
                </p>
              </div>

              {/* Generating Status */}
              {generationStatus === 'generating' && (
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Generating content...</p>
                      <p className="text-xs text-muted-foreground">This may take a moment</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {generationStatus === 'error' && error && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground mb-1">Generation Failed</p>
                      <p className="text-xs text-muted-foreground">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Success - Preview Generated Content */}
          {generationStatus === 'success' && generatedContent && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <p className="text-sm font-medium text-foreground">Content generated successfully!</p>
              </div>

              {/* Title Preview */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Title</label>
                <div className="p-3 rounded-md bg-muted/50 border border-border">
                  <p className="text-base font-semibold">{generatedContent.title}</p>
                </div>
              </div>

              {/* Meta Preview */}
              {Object.keys(generatedContent.meta).length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Metadata</label>
                  <div className="p-3 rounded-md bg-muted/50 border border-border space-y-2">
                    {Object.entries(generatedContent.meta).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <span className="text-xs font-mono text-muted-foreground min-w-24">
                          {key}:
                        </span>
                        <span className="text-xs text-foreground">
                          {Array.isArray(value) ? value.join(', ') : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Preview */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Content Preview</label>
                <div className="p-3 sm:p-4 rounded-md bg-muted/50 border border-border max-h-48 sm:max-h-64 overflow-y-auto">
                  <pre className="text-xs font-mono whitespace-pre-wrap text-foreground break-words">
                    {generatedContent.content}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 p-3 sm:p-4 border-t">
          {generationStatus === 'success' ? (
            <>
              <button
                onClick={handleTryAgain}
                className="h-10 px-4 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors order-2 sm:order-1 inline-flex items-center justify-center"
              >
                Generate Another
              </button>
              <div className="flex gap-2 order-1 sm:order-2">
                <button
                  onClick={handleClose}
                  className="flex-1 sm:flex-none h-10 px-4 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors inline-flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInsert}
                  className="flex-1 sm:flex-none h-10 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Insert Content</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-xs text-muted-foreground order-2 sm:order-1 text-center sm:text-left">
                {isGenerating ? 'Please wait...' : 'AI-generated content may require editing'}
              </div>
              <div className="flex gap-2 order-1 sm:order-2">
                <button
                  onClick={handleClose}
                  disabled={isGenerating}
                  className="flex-1 sm:flex-none h-10 px-4 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="flex-1 sm:flex-none h-10 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Generate</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

