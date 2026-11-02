// Minimal English-only i18n config.
// i18next/react-i18next have been removed — this file exists only for
// backward compatibility with imports of SUPPORTED_LANGUAGES and the
// default `i18n` object (used by ErrorBoundary).

import { t } from './translate';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
] as const;

export type LanguageCode = 'en';

export const LANGUAGE_STORAGE_KEY = 'janmitra_admin_lang';

export const i18n = {
  language: 'en',
  changeLanguage: (_lng: string) => {},
  t,
};

export default i18n;
