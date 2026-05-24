export const SUPPORTED_LANGUAGE_IDS = ['en', 'es', 'fr', 'ja', 'ko', 'zh'] as const;

export type LanguageId = (typeof SUPPORTED_LANGUAGE_IDS)[number];

export type SupportedLanguageId = LanguageId;

export const LANGUAGE_LABELS: Record<SupportedLanguageId, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  ja: '日本語',
  ko: '한국어',
  zh: '中文',
};

const LEGACY_MAP: Record<string, SupportedLanguageId> = {
  en: 'en',
  es: 'es',
  fr: 'fr',
  ja: 'ja',
  ko: 'ko',
  zh: 'zh',
  it: 'es',
  pt: 'es',
  de: 'fr',
  ms: 'en',
  tr: 'en',
  ar: 'en',
  ru: 'en',
};

export function normalizeLanguage(id: string | null | undefined): LanguageId {
  if (id && LEGACY_MAP[id]) return LEGACY_MAP[id];
  return 'en';
}

export function isSupportedLanguage(id: string): id is SupportedLanguageId {
  return SUPPORTED_LANGUAGE_IDS.includes(id as SupportedLanguageId);
}
