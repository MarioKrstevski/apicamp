/** Locales supported by the API and docs. Safe to use on client. */
export const SUPPORTED_LOCALES = ["en", "fr", "es", "sr", "de", "mk"] as const

export function getSupportedLocales(): readonly string[] {
  return SUPPORTED_LOCALES
}
