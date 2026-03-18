/**
 * Returns the auth.users id for the locale admin (from LOCALE_ADMIN_EN etc.).
 * Used to filter rows owned by that locale for API and docs. Server-only (uses process.env).
 */
export function getLocaleAdminId(locale: string): string | null {
  const key = `LOCALE_ADMIN_${locale.toUpperCase()}`
  const value = process.env[key]
  return typeof value === "string" && value.length > 0 ? value : null
}
