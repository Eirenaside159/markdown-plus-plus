export interface DefaultMetaSettings {
  [key: string]: string | string[];
}

export interface AppSettings {
  defaultMeta: DefaultMetaSettings;
  baseUrl?: string;
  urlFormat?: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultMeta: {},
  baseUrl: '',
  urlFormat: '{SLUG}',
};

