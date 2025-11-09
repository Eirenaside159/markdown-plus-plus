/**
 * AI Settings Component
 * Manages AI provider configurations (OpenAI, Gemini, Claude)
 */

import { useState, useEffect } from 'react';
import { Sparkles, Key, Check, X, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
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

  return (
    <div
      className={`p-4 rounded-lg border-2 transition-all ${
        enabled
          ? 'border-primary bg-primary/5'
          : 'border-border bg-card'
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
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
        </label>
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
                  className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showApiKey ? '🙈' : '👁️'}
                </button>
              </div>
              <button
                onClick={onTestConnection}
                disabled={!apiKey || isTestingConnection}
                className="px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:border-accent-foreground/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
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
                Test
              </button>
            </div>
          </div>

          {/* Fetch Models */}
          {apiKey && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Models</label>
                <button
                  onClick={onFetchModels}
                  disabled={isFetchingModels}
                  className="text-sm text-primary hover:text-primary/80 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                >
                  {isFetchingModels ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    'Fetch Models'
                  )}
                </button>
              </div>

              {availableModels.length > 0 ? (
                <select
                  value={defaultModel || ''}
                  onChange={(e) => onModelSelect(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select default model</option>
                  {availableModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                      {model.description ? ` - ${model.description}` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-sm text-muted-foreground py-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Click "Fetch Models" to load available models
                </div>
              )}
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
      toast[success ? 'success' : 'error'](
        success ? 'Connection successful!' : 'Connection failed. Check your API key.'
      );
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
        await updateProviderConfig(provider, {
          type: provider,
          enabled: currentConfig?.enabled || false,
          apiKey: currentConfig?.apiKey || '',
          availableModels: response.models,
          defaultModel: currentConfig?.defaultModel || response.models[0]?.id,
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

