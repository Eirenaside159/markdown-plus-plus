/**
 * AI Settings Component
 * Manages AI provider configurations (OpenAI, Gemini, Claude)
 */

import { useState, useEffect } from 'react';
import { Sparkles, Key, Check, X, Loader2, ExternalLink, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from './ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  loadAISettings,
  updateProviderConfig,
} from '@/lib/aiSettings';
import {
  getProvider,
  PROVIDER_NAMES,
  PROVIDER_DESCRIPTIONS,
  PROVIDER_DOCS,
} from '@/lib/aiProviders';
import type { AISettings as AISettingsType, AIProviderType, AIModel } from '@/types/ai-providers';

const Section = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string | React.ReactNode;
  children: React.ReactNode;
}) => {
  return (
    <section className="p-5 rounded-lg border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-base font-semibold leading-tight text-foreground">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          )}
        </div>
        <div>{children}</div>
      </div>
    </section>
  );
};

interface ProviderCardProps {
  providerType: AIProviderType;
  enabled: boolean;
  apiKey: string;
  defaultModel?: string;
  availableModels: AIModel[];
  onToggle: (enabled: boolean) => void;
  onApiKeyChange: (apiKey: string) => void;
  onModelSelect: (modelId: string) => void;
  onTestConnection: () => void;
  onFetchModels: () => void;
  isTestingConnection: boolean;
  isFetchingModels: boolean;
  connectionStatus?: 'success' | 'error' | null;
}

function ProviderCard({
  providerType,
  enabled,
  apiKey,
  defaultModel,
  availableModels,
  onToggle,
  onApiKeyChange,
  onModelSelect,
  onTestConnection,
  onFetchModels,
  isTestingConnection,
  isFetchingModels,
  connectionStatus,
}: ProviderCardProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [lastFetchedApiKey, setLastFetchedApiKey] = useState<string>('');

  // Auto-fetch models when API key is entered and hasn't been fetched yet
  useEffect(() => {
    // Only auto-fetch if we don't already have models cached
    if (enabled && apiKey && apiKey.length > 20 && apiKey !== lastFetchedApiKey && availableModels.length === 0 && !isFetchingModels) {
      // Wait a bit to avoid fetching on every keystroke
      const timer = setTimeout(() => {
        setLastFetchedApiKey(apiKey);
        onFetchModels();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [apiKey, enabled, availableModels.length, isFetchingModels, lastFetchedApiKey, onFetchModels]);

  // Ensure defaultModel is valid and set a sensible default when models load
  useEffect(() => {
    if (!enabled) return;
    if (!availableModels || availableModels.length === 0) return;

    const exists = defaultModel ? availableModels.some(m => m.id === defaultModel) : false;

    // If there is no default or it's not in the fetched models, set the first one
    if (!defaultModel || !exists) {
      onModelSelect(availableModels[0].id);
    }
  }, [enabled, availableModels, defaultModel, onModelSelect]);

  return (
    <div
      className={`p-4 rounded-lg border transition-all ${
        enabled
          ? 'border-primary/50 bg-primary/5 shadow-sm'
          : 'border-border bg-card/50'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-base font-semibold text-foreground">
              {PROVIDER_NAMES[providerType]}
            </h4>
            <a
              href={PROVIDER_DOCS[providerType]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              title="Get API Key"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          <p className="text-sm text-muted-foreground">
            {PROVIDER_DESCRIPTIONS[providerType]}
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
        />
      </div>

      {/* API Key Input */}
      {enabled && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Key
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => onApiKeyChange(e.target.value)}
                  placeholder="Enter your API key"
                  className="w-full h-10 px-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-accent"
                  title={showApiKey ? 'Hide API key' : 'Show API key'}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button
                onClick={onTestConnection}
                disabled={!apiKey || isTestingConnection}
                className="h-10 px-4 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 shrink-0"
                title="Test connection"
              >
                {isTestingConnection ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : connectionStatus === 'success' ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : connectionStatus === 'error' ? (
                  <X className="h-4 w-4 text-destructive" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span>Test</span>
              </button>
            </div>
          </div>

          {/* Model Selection */}
          {apiKey && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium text-foreground">Default Model</label>
                <div className="inline-flex items-center gap-2">
                  {isFetchingModels && (
                    <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading...
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={onFetchModels}
                    disabled={isFetchingModels || !apiKey}
                    className="h-7 px-2 text-xs rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Refresh models"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {availableModels.length > 0 ? (
                <div className="space-y-2">
                  <div className="space-y-1.5">
                    <Select
                      value={defaultModel || ''}
                      onValueChange={onModelSelect}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select default model" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {availableModels.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {availableModels.length} model{availableModels.length !== 1 ? 's' : ''} available
                    {defaultModel && ` • Selected: ${defaultModel}`}
                  </p>
                </div>
              ) : !isFetchingModels ? (
                <div className="p-3 rounded-md bg-muted/50 border border-border flex items-start gap-2 text-xs text-muted-foreground">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground mb-0.5">Models will load automatically</p>
                    <p>Test your connection first, then models will be fetched automatically.</p>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AISettings() {
  const [settings, setSettings] = useState<AISettingsType | null>(null);
  const [testingConnection, setTestingConnection] = useState<Record<AIProviderType, boolean>>({
    openai: false,
    gemini: false,
    claude: false,
  });
  const [fetchingModels, setFetchingModels] = useState<Record<AIProviderType, boolean>>({
    openai: false,
    gemini: false,
    claude: false,
  });
  const [connectionStatus, setConnectionStatus] = useState<
    Record<AIProviderType, 'success' | 'error' | null>
  >({
    openai: null,
    gemini: null,
    claude: null,
  });

  useEffect(() => {
    loadAISettings().then(setSettings);
  }, []);

  const handleToggleProvider = async (provider: AIProviderType, enabled: boolean) => {
    if (!settings) return;

    const currentConfig = settings.providers[provider];
    await updateProviderConfig(provider, {
      type: provider,
      enabled,
      apiKey: currentConfig?.apiKey || '',
      availableModels: currentConfig?.availableModels || [],
      defaultModel: currentConfig?.defaultModel,
    });

    const updatedSettings = await loadAISettings();
    setSettings(updatedSettings);

    toast.success(`${PROVIDER_NAMES[provider]} ${enabled ? 'enabled' : 'disabled'}`);
  };

  const handleApiKeyChange = async (provider: AIProviderType, apiKey: string) => {
    if (!settings) return;

    const currentConfig = settings.providers[provider];
    await updateProviderConfig(provider, {
      type: provider,
      enabled: currentConfig?.enabled || false,
      apiKey,
      availableModels: currentConfig?.availableModels || [],
      defaultModel: currentConfig?.defaultModel,
    });

    const updatedSettings = await loadAISettings();
    setSettings(updatedSettings);

    // Reset connection status when API key changes
    setConnectionStatus((prev) => ({ ...prev, [provider]: null }));
  };

  const handleTestConnection = async (provider: AIProviderType) => {
    if (!settings?.providers[provider]?.apiKey) return;

    setTestingConnection((prev) => ({ ...prev, [provider]: true }));
    setConnectionStatus((prev) => ({ ...prev, [provider]: null }));

    try {
      const providerInstance = getProvider(provider);
      const success = await providerInstance.testConnection(
        settings.providers[provider]!.apiKey
      );

      setConnectionStatus((prev) => ({ ...prev, [provider]: success ? 'success' : 'error' }));

      if (success) {
        toast.success('Connection successful!');
        // Always refresh models on successful connection
        handleFetchModels(provider);
      } else {
        toast.error('Connection failed. Check your API key.');
      }
    } catch (error) {
      setConnectionStatus((prev) => ({ ...prev, [provider]: 'error' }));
      toast.error('Connection test failed');
    } finally {
      setTestingConnection((prev) => ({ ...prev, [provider]: false }));
    }
  };

  const handleFetchModels = async (provider: AIProviderType) => {
    if (!settings?.providers[provider]?.apiKey) return;

    setFetchingModels((prev) => ({ ...prev, [provider]: true }));

    try {
      const providerInstance = getProvider(provider);
      const response = await providerInstance.fetchModels(
        settings.providers[provider]!.apiKey
      );

      if (response.success && response.models) {
        const currentConfig = settings.providers[provider];
        const keepExistingDefault = currentConfig?.defaultModel
          ? response.models.some((m) => m.id === currentConfig!.defaultModel)
          : false;
        await updateProviderConfig(provider, {
          type: provider,
          enabled: currentConfig?.enabled || false,
          apiKey: currentConfig?.apiKey || '',
          availableModels: response.models,
          defaultModel: keepExistingDefault ? currentConfig!.defaultModel : response.models[0]?.id,
        });

        const updatedSettings = await loadAISettings();
        setSettings(updatedSettings);

        toast.success(`Loaded ${response.models.length} models`);
      } else {
        toast.error(response.error || 'Failed to fetch models');
      }
    } catch (error) {
      toast.error('Failed to fetch models');
    } finally {
      setFetchingModels((prev) => ({ ...prev, [provider]: false }));
    }
  };

  const handleModelSelect = async (provider: AIProviderType, modelId: string) => {
    if (!settings) return;

    const currentConfig = settings.providers[provider];
    await updateProviderConfig(provider, {
      type: provider,
      enabled: currentConfig?.enabled || false,
      apiKey: currentConfig?.apiKey || '',
      availableModels: currentConfig?.availableModels || [],
      defaultModel: modelId,
    });

    const updatedSettings = await loadAISettings();
    setSettings(updatedSettings);

    toast.success(`Default model set to ${modelId}`);
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const providers: AIProviderType[] = ['openai', 'gemini', 'claude'];

  return (
    <div className="space-y-6 pr-2">
      <Section
        title="AI Providers"
        description={
          <>
            Configure AI providers to enable content generation. You can enable multiple providers
            and switch between them when generating content.{' '}
            <span className="text-warning font-medium">
              API keys are stored locally in your browser.
            </span>
          </>
        }
      >
        <div className="space-y-4">
          {providers.map((provider) => {
            const config = settings.providers[provider];
            return (
              <ProviderCard
                key={provider}
                providerType={provider}
                enabled={config?.enabled || false}
                apiKey={config?.apiKey || ''}
                defaultModel={config?.defaultModel}
                availableModels={config?.availableModels || []}
                onToggle={(enabled) => handleToggleProvider(provider, enabled)}
                onApiKeyChange={(apiKey) => handleApiKeyChange(provider, apiKey)}
                onModelSelect={(modelId) => handleModelSelect(provider, modelId)}
                onTestConnection={() => handleTestConnection(provider)}
                onFetchModels={() => handleFetchModels(provider)}
                isTestingConnection={testingConnection[provider]}
                isFetchingModels={fetchingModels[provider]}
                connectionStatus={connectionStatus[provider]}
              />
            );
          })}
        </div>
      </Section>

      {/* Usage Tips */}
      <Section title="Usage Tips">
        <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
          <li>API keys are securely stored in your browser's IndexedDB</li>
          <li>You can enable multiple providers and switch between them</li>
          <li>Fetch models to see what's available with your API key</li>
          <li>Set a default model for quick access when generating content</li>
          <li>Test your connection to verify your API key is working</li>
          <li>
            <span className="text-warning font-medium">Remember:</span> AI API usage incurs costs
            from the providers
          </li>
        </ul>
      </Section>
    </div>
  );
}

