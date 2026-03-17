"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function VerifiedPage() {
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(t)
          window.location.href = "/dashboard"
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="w-full max-w-sm text-center">
      <h1 className="mb-2 text-2xl font-semibold text-foreground">Email verified</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Your account is active and you’re signed in. Redirecting to your dashboard…
      </p>
      <p className="mb-4 text-xs text-muted-foreground">
        Redirecting in {countdown} second{countdown !== 1 ? "s" : ""}…
      </p>
      <Link
        href="/dashboard"
        className="text-sm font-medium text-primary underline underline-offset-4 hover:no-underline"
      >
        Go to dashboard now
      </Link>
    </div>
  )
}
