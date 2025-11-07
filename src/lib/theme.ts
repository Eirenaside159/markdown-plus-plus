import type { ThemeMode } from '@/types/settings';
import { getSettings, saveSettings } from './settings';
import { applyColorPalette } from './colorPalettes';

export function applyTheme(theme: ThemeMode): void {
  const root = document.documentElement;
  
  if (theme === 'system') {
    // Use system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  } else if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  
  // Reapply color palette with new theme
  const settings = getSettings();
  if (settings.colorPalette) {
    const isDark = root.classList.contains('dark');
    applyColorPalette(settings.colorPalette, isDark);
  }
}

export function setTheme(theme: ThemeMode): void {
  const settings = getSettings();
  const updatedSettings = { ...settings, theme };
  saveSettings(updatedSettings);
  applyTheme(theme);
}

export function getCurrentTheme(): ThemeMode {
  const settings = getSettings();
  return settings.theme || 'system';
}

export function isDarkMode(): boolean {
  return document.documentElement.classList.contains('dark');
}

// Listen to system theme changes when in system mode
export function initThemeListener(): void {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handleChange = () => {
    const currentTheme = getCurrentTheme();
    if (currentTheme === 'system') {
      applyTheme('system');
    }
  };
  
  // Modern browsers
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleChange);
  } else {
    // Fallback for older browsers
    mediaQuery.addListener(handleChange);
  }
}

