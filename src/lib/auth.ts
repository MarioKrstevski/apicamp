// Stub — pending implementation (see CLAUDE.md task list)

export type Account = {
  id: string
  tier: "free" | "paid"
  role: "user" | "locale_admin" | "superadmin"
  locale?: string
}

export async function validateApiKey(_key: string | null): Promise<Account | null> {
  throw new Error("validateApiKey not implemented yet")
}
