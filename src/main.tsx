import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Toaster } from './components/ui/sonner'
import { Buffer } from 'buffer'
import { getSettings } from './lib/settings'
import { applyTheme, initThemeListener } from './lib/theme'

// Polyfill Buffer for gray-matter
window.Buffer = Buffer

// Apply saved theme and color palette on app initialization
const settings = getSettings();
applyTheme(settings.theme || 'system');

// Listen for system theme changes
initThemeListener();

// Listen for dark mode changes and reapply color palette
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
      const currentSettings = getSettings();
      if (currentSettings.colorPalette) {
        const isDark = document.documentElement.classList.contains('dark');
        import('./lib/colorPalettes').then(({ applyColorPalette }) => {
          applyColorPalette(currentSettings.colorPalette!, isDark);
        });
      }
    }
  });
});

observer.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['class']
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster />
  </StrictMode>,
)
