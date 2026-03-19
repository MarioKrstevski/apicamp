import { createHash } from "node:crypto"
import { createClient } from "@/lib/supabase/server"

export type Account = {
  id: string
  role: "user" | "locale_admin" | "youtuber" | "superadmin"
  isBlocked: boolean
  everPaid: boolean
}

export type ValidateKeyResult =
  | { ok: true;  account: Account }
  | { ok: false; status: 401 | 403; message: string }

const err = (status: 401 | 403, message: string): ValidateKeyResult => ({ ok: false, status, message })

export async function validateApiKey(raw: string | null): Promise<ValidateKeyResult> {
  if (!raw) return err(401, "Missing API key — pass it in the x-api-key header")

  const supabase = await createClient()
  const keyHash = createHash("sha256").update(raw).digest("hex")

  const { data: key } = await supabase
    .from("api_keys")
    .select("id, status, expires_at, owner_id")
    .eq("key_hash", keyHash)
    .single()

  if (!key)                                               return err(401, "Invalid API key")
  if (key.status === "revoked")                           return err(401, "This key has been revoked")
  if (key.status === "unclaimed" || key.status === "donated") return err(401, "Key not yet activated")
  if (key.expires_at && new Date(key.expires_at) < new Date()) return err(401, "Key expired — renew from your dashboard")
  if (!key.owner_id)                                      return err(401, "Key has no owner — contact support")

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, is_blocked, ever_paid")
    .eq("id", key.owner_id)
    .single()

  if (!profile)           return err(401, "Account not found")
  if (profile.is_blocked) return err(403, "Account suspended")

  // Fire-and-forget: update last_used_at
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", key.id)
    .then(() => {})

  return {
    ok: true,
    account: {
      id:        profile.id,
      role:      profile.role as Account["role"],
      isBlocked: profile.is_blocked,
      everPaid:  profile.ever_paid,
    },
  }
}
