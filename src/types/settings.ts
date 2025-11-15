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
  // Local Git settings
  gitAuthor?: string;
  gitEmail?: string;
  gitToken?: string;
  // Remote Repository settings
  githubToken?: string;
  gitlabToken?: string;
  // OAuth settings (optional - for self-hosted deployments)
  githubOAuthUrl?: string;
  gitlabOAuthUrl?: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultMeta: {},
  baseUrl: '',
  urlFormat: '{SLUG}',
  metaFieldMultiplicity: {},
  colorPalette: 'neutral',
  theme: 'system',
  gitAuthor: '',
  gitEmail: '',
  gitToken: '',
  githubToken: '',
  gitlabToken: '',
  githubOAuthUrl: '',
  gitlabOAuthUrl: '',
};

