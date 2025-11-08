// Persistence for DataTable column visibility
import type { VisibilityState } from '@tanstack/react-table';

const STORAGE_KEY = 'mdplusplus-column-visibility';

export interface ColumnVisibilityConfig {
  visibility: VisibilityState;
  lastUpdate: number;
}

export function saveColumnVisibility(visibility: VisibilityState): void {
  try {
    const config: ColumnVisibilityConfig = {
      visibility,
      lastUpdate: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save column visibility:', error);
  }
}

export function loadColumnVisibility(): VisibilityState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const config = JSON.parse(saved) as ColumnVisibilityConfig;
      return config.visibility;
    }
  } catch (error) {
    console.error('Failed to load column visibility:', error);
  }
  return {};
}

export function exportColumnVisibility(): string {
  const config: ColumnVisibilityConfig = {
    visibility: loadColumnVisibility(),
    lastUpdate: Date.now(),
  };
  return JSON.stringify(config, null, 2);
}

export function importColumnVisibility(jsonString: string): boolean {
  try {
    const config = JSON.parse(jsonString) as ColumnVisibilityConfig;
    if (config && typeof config.visibility === 'object') {
      saveColumnVisibility(config.visibility);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to import column visibility:', error);
    return false;
  }
}

export function resetColumnVisibility(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to reset column visibility:', error);
  }
}

