/**
 * AI Settings Manager
 * Handles AI provider settings persistence using IndexedDB
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { AISettings, AIProviderType, AIProviderConfig } from '../types/ai-providers';

const DB_NAME = 'mdadmin-ai-settings';
const DB_VERSION = 1;
const STORE_NAME = 'ai-config';
const SETTINGS_KEY = 'ai-settings';

// Database instance
let dbInstance: IDBPDatabase | null = null;

/**
 * Initialize and get database instance
 */
async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });

  return dbInstance;
}

/**
 * Get default AI settings
 */
export function getDefaultAISettings(): AISettings {
  return {
    providers: {},
  };
}

/**
 * Load AI settings from IndexedDB
 */
export async function loadAISettings(): Promise<AISettings> {
  try {
    const db = await getDB();
    const settings = await db.get(STORE_NAME, SETTINGS_KEY);
    
    if (!settings) {
      return getDefaultAISettings();
    }

    return settings as AISettings;
  } catch (error) {
    console.error('Failed to load AI settings:', error);
    return getDefaultAISettings();
  }
}

/**
 * Save AI settings to IndexedDB
 */
export async function saveAISettings(settings: AISettings): Promise<void> {
  try {
    const db = await getDB();
    await db.put(STORE_NAME, settings, SETTINGS_KEY);
  } catch (error) {
    console.error('Failed to save AI settings:', error);
    throw new Error('Failed to save AI settings');
  }
}

/**
 * Update a specific provider configuration
 */
export async function updateProviderConfig(
  provider: AIProviderType,
  config: Partial<AIProviderConfig>
): Promise<void> {
  const settings = await loadAISettings();
  
  settings.providers[provider] = {
    ...settings.providers[provider],
    ...config,
    type: provider,
  } as AIProviderConfig;

  await saveAISettings(settings);
}

/**
 * Enable or disable a provider
 */
export async function toggleProvider(
  provider: AIProviderType,
  enabled: boolean
): Promise<void> {
  const settings = await loadAISettings();
  
  if (settings.providers[provider]) {
    settings.providers[provider]!.enabled = enabled;
    await saveAISettings(settings);
  }
}

/**
 * Get enabled providers
 */
export async function getEnabledProviders(): Promise<AIProviderType[]> {
  const settings = await loadAISettings();
  return Object.entries(settings.providers)
    .filter(([_, config]) => config?.enabled && config?.apiKey)
    .map(([type]) => type as AIProviderType);
}

/**
 * Get provider config
 */
export async function getProviderConfig(
  provider: AIProviderType
): Promise<AIProviderConfig | null> {
  const settings = await loadAISettings();
  return settings.providers[provider] || null;
}

/**
 * Clear all AI settings
 */
export async function clearAISettings(): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(STORE_NAME, SETTINGS_KEY);
  } catch (error) {
    console.error('Failed to clear AI settings:', error);
    throw new Error('Failed to clear AI settings');
  }
}

/**
 * Export AI settings (for backup/transfer)
 */
export async function exportAISettings(): Promise<string> {
  const settings = await loadAISettings();
  return JSON.stringify(settings, null, 2);
}

/**
 * Import AI settings (from backup/transfer)
 */
export async function importAISettings(jsonString: string): Promise<void> {
  try {
    const settings = JSON.parse(jsonString) as AISettings;
    
    // Validate structure
    if (!settings.providers || typeof settings.providers !== 'object') {
      throw new Error('Invalid AI settings format');
    }

    await saveAISettings(settings);
  } catch (error) {
    console.error('Failed to import AI settings:', error);
    throw new Error('Failed to import AI settings');
  }
}

/**
 * Set last used provider and model
 */
export async function setLastUsed(
  provider: AIProviderType,
  model: string
): Promise<void> {
  const settings = await loadAISettings();
  settings.lastUsedProvider = provider;
  settings.lastUsedModel = model;
  await saveAISettings(settings);
}

