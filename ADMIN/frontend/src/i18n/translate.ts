// Minimal English-only translation module.
// Replaces react-i18next — no external dependencies, no language switching.

import en from './en.json';

type NestedRecord = { [key: string]: string | NestedRecord };

const translations = en as NestedRecord;

/**
 * Looks up a dot-notation key in the English translations and interpolates
 * `{{arg}}` placeholders with the provided options.
 */
export function t(key: string, options?: Record<string, unknown>): string {
  const parts = key.split('.');
  let current: string | NestedRecord = translations;

  for (const part of parts) {
    if (typeof current === 'string' || current === undefined || current === null) {
      return key;
    }
    current = (current as NestedRecord)[part];
  }

  let result: string;
  if (typeof current === 'string') {
    result = current;
  } else {
    return key;
  }

  if (options) {
    for (const [optKey, optVal] of Object.entries(options)) {
      result = result.replace(new RegExp(`{{\\s*${optKey}\\s*}}`, 'g'), String(optVal));
    }
  }

  return result;
}

/** Compatibility hook — returns the t function and a stub i18n object. */
export function useTranslation() {
  return {
    t,
    i18n: {
      language: 'en',
      changeLanguage: (_lng: string) => {},
    },
  };
}
