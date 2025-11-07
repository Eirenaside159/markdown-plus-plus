export interface DefaultMetaSettings {
  [key: string]: string | string[];
}

export type MetaMultiplicity = 'single' | 'multi';

export type ColorPalette = 'neutral' | 'stone' | 'zinc' | 'slate' | 'gray' | 
  'red' | 'orange' | 'amber' | 'yellow' | 'lime' | 'green' | 'emerald' | 
  'teal' | 'cyan' | 'sky' | 'blue' | 'indigo' | 'violet' | 'purple' | 
  'fuchsia' | 'pink' | 'rose';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppSettings {
  defaultMeta: DefaultMetaSettings;
  baseUrl?: string;
  urlFormat?: string;
  metaFieldMultiplicity?: Record<string, MetaMultiplicity>;
  colorPalette?: ColorPalette;
  theme?: ThemeMode;
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultMeta: {},
  baseUrl: '',
  urlFormat: '{SLUG}',
  metaFieldMultiplicity: {},
  colorPalette: 'neutral',
  theme: 'system',
};

