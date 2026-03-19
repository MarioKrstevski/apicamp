import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getActiveKey, getGiftKeys, getExpiredKey } from "@/lib/keys"
import { KeySection } from "./KeySection"
import { GiftKeySection } from "./GiftKeySection"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const [profile, activeKey, expiredKey, giftKeys, subscription] = await Promise.all([
    supabase.from("profiles").select("role, is_blocked, ever_paid").eq("id", user.id).single().then(r => r.data),
    getActiveKey(user.id),
    getExpiredKey(user.id),
    getGiftKeys(user.id),
    supabase.from("subscriptions").select("id, gift_keys_earned, gift_keys_used, expires_at")
      .eq("user_id", user.id).gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }).limit(1).single().then(r => r.data),
  ])

  const hasActiveSub = !!subscription

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
      </div>

      <KeySection
        activeKey={activeKey}
        expiredKey={expiredKey}
        hasActiveSub={hasActiveSub}
        everPaid={profile?.ever_paid ?? false}
      />

      {hasActiveSub && subscription && (
        <GiftKeySection
          giftKeys={giftKeys}
          giftKeysEarned={subscription.gift_keys_earned}
          giftKeysUsed={subscription.gift_keys_used}
        />
      )}

      {!profile?.ever_paid && !activeKey && !expiredKey && (
        <section className="rounded-lg border border-border p-6">
          <h2 className="font-semibold text-foreground mb-1">Request a donated key</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Don&apos;t have a subscription? You can request a free key from our community pool.
          </p>
          <a href="/request-key" className="text-sm text-primary underline underline-offset-4">
            Submit a request →
          </a>
        </section>
      )}
    </main>
  )
}
