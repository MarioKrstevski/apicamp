/** Locales supported by the API and docs (en, fr, es, sr). Safe to use on client. */
export const SUPPORTED_LOCALES = ["en", "fr", "es", "sr"] as const

export function getSupportedLocales(): readonly string[] {
  return SUPPORTED_LOCALES
}
