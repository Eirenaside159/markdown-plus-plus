export interface DefaultMetaSettings {
  [key: string]: string | string[];
}

export type MetaMultiplicity = 'single' | 'multi';

export interface AppSettings {
  defaultMeta: DefaultMetaSettings;
  baseUrl?: string;
  urlFormat?: string;
  metaFieldMultiplicity?: Record<string, MetaMultiplicity>;
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultMeta: {},
  baseUrl: '',
  urlFormat: '{SLUG}',
  metaFieldMultiplicity: {},
};

