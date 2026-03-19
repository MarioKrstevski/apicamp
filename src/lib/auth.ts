// lib/auth.ts

export type Account = {
  id: string
  role: "user" | "locale_admin" | "youtuber" | "superadmin"
  isBlocked: boolean
  everPaid: boolean
}

/** Discriminated return type — lets bootstrap emit spec-correct error messages */
export type ValidateKeyResult =
  | { ok: true;  account: Account }
  | { ok: false; status: 401 | 403; message: string }

/**
 * Validates an API key from the x-api-key header.
 * Implementation in Task 5 — stub kept until then.
 */
export async function validateApiKey(_key: string | null): Promise<ValidateKeyResult> {
  // TODO: implement in Task 5
  return {
    ok: true,
    account: {
      id: "00000000-0000-0000-0000-000000000000",
      role: "user",
      isBlocked: false,
      everPaid: false,
    },
  }
}
