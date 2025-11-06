import type { AppSettings } from '@/types/settings';
import { DEFAULT_SETTINGS } from '@/types/settings';

const STORAGE_KEY = 'mdplusplus-settings';

export function getSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults to ensure all fields exist
      return {
        defaultMeta: { ...DEFAULT_SETTINGS.defaultMeta, ...parsed.defaultMeta },
        baseUrl: parsed.baseUrl ?? DEFAULT_SETTINGS.baseUrl,
        urlFormat: parsed.urlFormat ?? DEFAULT_SETTINGS.urlFormat,
      };
    }
  } catch (error) {
    // Return defaults on error
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    // Silently handle error
  }
}

export function resetSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    // Silently handle error
  }
}

