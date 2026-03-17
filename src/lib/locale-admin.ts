/**
 * Checks whether a Supabase user ID belongs to a locale admin account.
 * Dynamically scans all LOCALE_ADMIN_* environment variables.
 *
 * Edge-runtime safe: no Node.js-only imports, no async, pure string ops.
 * TypeScript type imports are allowed (erased at build time).
 *
 * @returns Locale suffix (e.g. "EN", "FR", "MK") or null if not an admin.
 * Access-control callers: check !== null only.
 * Display callers: may use the returned string directly.
 */
export function isLocaleAdmin(userId: string): string | null {
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith("LOCALE_ADMIN_") && value === userId) {
      return key.replace("LOCALE_ADMIN_", "");
    }
  }
  return null;
}
