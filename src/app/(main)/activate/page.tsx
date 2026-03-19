"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function ActivatePage() {
  const router = useRouter()
  const [keyValue, setKeyValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // If redirected back here after login with a pending key in sessionStorage
  useEffect(() => {
    const pending = sessionStorage.getItem("pendingActivationKey")
    if (pending) {
      setKeyValue(pending)
      sessionStorage.removeItem("pendingActivationKey")
    }
  }, [])

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Not logged in — store key and redirect to signup
        sessionStorage.setItem("pendingActivationKey", keyValue.trim())
        router.push("/auth/signup?next=/activate")
        return
      }

      const res = await fetch("/api/keys/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyValue.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setSuccess(true)
    } catch {
      setError("Network error — please try again")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <main className="mx-auto max-w-md px-6 py-20 text-center space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">Key activated!</h1>
        <p className="text-sm text-muted-foreground">Your API key is now active. Head to your dashboard to see it.</p>
        <a href="/dashboard" className="inline-block rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80 transition-colors">
          Go to dashboard →
        </a>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-md px-6 py-20 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Activate a key</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter a gift key or donated key to activate your account.
        </p>
      </div>

      <form onSubmit={handleActivate} className="space-y-4">
        <div>
          <label htmlFor="key" className="block text-sm font-medium text-foreground mb-1.5">
            Key code
          </label>
          <input
            id="key"
            type="text"
            value={keyValue}
            onChange={e => setKeyValue(e.target.value)}
            placeholder="ak_..."
            required
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80 transition-colors disabled:opacity-50"
        >
          {loading ? "Activating…" : "Activate key"}
        </button>
      </form>
    </main>
  )
}
