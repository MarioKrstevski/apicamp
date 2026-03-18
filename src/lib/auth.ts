// Stub — pending implementation (see CLAUDE.md task list)

export type Account = {
  id: string
  tier: "free" | "paid"
  role: "user" | "locale_admin" | "superadmin"
  locale?: string
}

/**
 * Temporary stub: treat missing/any API key as a public free account.
 * Uses a valid UUID so queries against uuid columns succeed.
 */
export async function validateApiKey(_key: string | null): Promise<Account | null> {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    tier: "free",
    role: "user",
    locale: "en"
  }
}
