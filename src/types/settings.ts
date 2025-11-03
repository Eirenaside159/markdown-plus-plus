export interface DefaultMetaSettings {
  [key: string]: string | string[];
}

export interface AppSettings {
  defaultMeta: DefaultMetaSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultMeta: {},
};

