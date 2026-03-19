import { NextRequest, NextResponse } from "next/server"
import type { Account } from "@/lib/auth"
import {
  signupAccount, signinAccount, verifyEmail,
  validateEmail, validatePassword,
  validatePracticeToken, signoutToken,
  initPasswordReset, resetPassword,
  getOrCreateProfile, updateProfile, deleteAccount,
  makeDebugUrl,
} from "@/lib/auth-practice"

type Parsed = {
  tail: string[]
  behaviors: string[]
  locale: string
  version: string
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function handleAuthRequest(
  req: NextRequest,
  parsed: Parsed,
  account: Account,
  method: string
): Promise<NextResponse> {
  const tier   = parsed.tail[1] as "basic" | "token" | "profile" | undefined
  const action = parsed.tail[2] as string | undefined

  // Apply delay modifier
  const delay = parsed.behaviors.includes("slow3") ? 3000
              : parsed.behaviors.includes("slow2") ? 1500
              : parsed.behaviors.includes("slow1") ? 500
              : 0
  if (delay > 0) await new Promise(r => setTimeout(r, delay))

  // Chaos modifier
  if (parsed.behaviors.includes("chaos") && Math.random() < 0.3) {
    const errors = [
      { status: 500, error: "Internal Server Error" },
      { status: 503, error: "Service Unavailable" },
      { status: 504, error: "Gateway Timeout" },
    ]
    const e = errors[Math.floor(Math.random() * errors.length)]
    return NextResponse.json({ error: e.error }, { status: e.status })
  }

  if (!tier || !["basic", "token", "profile"].includes(tier)) {
    return NextResponse.json(
      { error: "Unknown auth tier. Use: auth/basic, auth/token, or auth/profile" },
      { status: 404 }
    )
  }

  if (!action) {
    return NextResponse.json({ error: "No action specified" }, { status: 404 })
  }

  if (tier === "basic")   return handleBasic(req, action, method, account, parsed)
  if (tier === "token")   return handleToken(req, action, method, account, parsed)
  return handleProfile(req, action, method, account, parsed)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function baseUrl(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? `${req.nextUrl.protocol}//${req.nextUrl.host}`
}

function bearerToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization") ?? ""
  return auth.startsWith("Bearer ") ? auth.slice(7) : null
}

async function parseBody(req: NextRequest): Promise<Record<string, unknown>> {
  try { return await req.json() } catch { return {} }
}

// ─── BASIC tier ───────────────────────────────────────────────────────────────

async function handleBasic(
  req: NextRequest,
  action: string,
  method: string,
  account: Account,
  parsed: Parsed
): Promise<NextResponse> {
  const url = req.nextUrl

  // POST /auth/basic/signup
  if (action === "signup" && method === "POST") {
    const body     = await parseBody(req)
    const email    = typeof body.email    === "string" ? body.email.toLowerCase().trim() : ""
    const password = typeof body.password === "string" ? body.password : ""

    const emailErr = validateEmail(email)
    if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 })
    const passErr = validatePassword(password)
    if (passErr) return NextResponse.json({ error: passErr }, { status: 400 })

    let result
    try { result = await signupAccount("basic", account.id, email, password) }
    catch { return NextResponse.json({ error: "Failed to create account" }, { status: 500 }) }

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

    const debug = makeDebugUrl(
      baseUrl(req),
      `/api/${parsed.locale}/${parsed.version}/auth/basic/verify-email`,
      result.verificationToken
    )

    return NextResponse.json({ success: true, account: result.account, debug }, { status: 201 })
  }

  // POST /auth/basic/signin
  if (action === "signin" && method === "POST") {
    const body     = await parseBody(req)
    const email    = typeof body.email    === "string" ? body.email.toLowerCase().trim() : ""
    const password = typeof body.password === "string" ? body.password : ""

    if (!email || !password) {
      return NextResponse.json({ error: "email and password are required" }, { status: 400 })
    }

    let result
    try { result = await signinAccount("basic", account.id, email, password) }
    catch { return NextResponse.json({ error: "Signin failed" }, { status: 500 }) }

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

    return NextResponse.json({ success: true, account: result.account })
  }

  // GET /auth/basic/verify-email?token=...
  if (action === "verify-email" && method === "GET") {
    const token = url.searchParams.get("token")
    if (!token) return NextResponse.json({ error: "token query param is required" }, { status: 400 })

    let result
    try { result = await verifyEmail("basic", account.id, token) }
    catch { return NextResponse.json({ error: "Verification failed" }, { status: 500 }) }

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

    return NextResponse.json({ success: true, message: "Email verified. You can now sign in." })
  }

  // POST /auth/basic/signout
  if (action === "signout" && method === "POST") {
    return NextResponse.json({
      success: true,
      message: "Signed out. (Basic tier has no session token to invalidate — see auth/token for stateful signout.)",
    })
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 404 })
}

// ─── TOKEN tier ───────────────────────────────────────────────────────────────

async function handleToken(
  req: NextRequest,
  action: string,
  method: string,
  account: Account,
  parsed: Parsed
): Promise<NextResponse> {
  const url = req.nextUrl

  if (action === "signup" && method === "POST") {
    const body     = await parseBody(req)
    const email    = typeof body.email    === "string" ? body.email.toLowerCase().trim() : ""
    const password = typeof body.password === "string" ? body.password : ""

    const emailErr = validateEmail(email)
    if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 })
    const passErr = validatePassword(password)
    if (passErr) return NextResponse.json({ error: passErr }, { status: 400 })

    let result
    try { result = await signupAccount("token", account.id, email, password) }
    catch { return NextResponse.json({ error: "Failed to create account" }, { status: 500 }) }

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

    // Issue a session token immediately on signup
    let token: string | undefined
    try {
      const signinResult = await signinAccount("token", account.id, email, password)
      if (signinResult.ok) token = signinResult.token
    } catch { /* non-fatal — account created, token optional */ }

    const debug = makeDebugUrl(
      baseUrl(req),
      `/api/${parsed.locale}/${parsed.version}/auth/token/verify-email`,
      result.verificationToken
    )

    return NextResponse.json({ success: true, token, account: result.account, debug }, { status: 201 })
  }

  if (action === "signin" && method === "POST") {
    const body     = await parseBody(req)
    const email    = typeof body.email    === "string" ? body.email.toLowerCase().trim() : ""
    const password = typeof body.password === "string" ? body.password : ""

    if (!email || !password) {
      return NextResponse.json({ error: "email and password are required" }, { status: 400 })
    }

    let result
    try { result = await signinAccount("token", account.id, email, password) }
    catch { return NextResponse.json({ error: "Signin failed" }, { status: 500 }) }

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

    return NextResponse.json({ success: true, token: result.token, account: result.account })
  }

  if (action === "signout" && method === "POST") {
    const raw = bearerToken(req)
    if (!raw) return NextResponse.json({ error: "Authorization: Bearer <token> header required" }, { status: 401 })

    try { await signoutToken("token", raw) }
    catch { return NextResponse.json({ error: "Signout failed" }, { status: 500 }) }

    return NextResponse.json({ success: true, message: "Token invalidated." })
  }

  if (action === "me" && method === "GET") {
    const raw = bearerToken(req)
    if (!raw) return NextResponse.json({ error: "Authorization: Bearer <token> header required" }, { status: 401 })

    const result = await validatePracticeToken("token", account.id, raw)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

    return NextResponse.json({ account: result.account })
  }

  if (action === "verify-email" && method === "GET") {
    const token = url.searchParams.get("token")
    if (!token) return NextResponse.json({ error: "token query param is required" }, { status: 400 })

    let result
    try { result = await verifyEmail("token", account.id, token) }
    catch { return NextResponse.json({ error: "Verification failed" }, { status: 500 }) }

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ success: true, message: "Email verified." })
  }

  if (action === "forgot-password" && method === "POST") {
    const body  = await parseBody(req)
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : ""

    if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 })

    let resetToken: string | null = null
    try { resetToken = await initPasswordReset("token", account.id, email) }
    catch { return NextResponse.json({ error: "Request failed" }, { status: 500 }) }

    const response: Record<string, unknown> = {
      message: "If that email is registered, a reset link has been sent.",
    }
    if (resetToken) {
      response.debug = makeDebugUrl(
        baseUrl(req),
        `/api/${parsed.locale}/${parsed.version}/auth/token/reset-password`,
        resetToken
      )
    }
    return NextResponse.json(response)
  }

  if (action === "reset-password" && method === "POST") {
    const token    = url.searchParams.get("token")
    const body     = await parseBody(req)
    const password = typeof body.password === "string" ? body.password : ""

    if (!token) return NextResponse.json({ error: "token query param is required" }, { status: 400 })
    const passErr = validatePassword(password)
    if (passErr) return NextResponse.json({ error: passErr }, { status: 400 })

    let result
    try { result = await resetPassword("token", account.id, token, password) }
    catch { return NextResponse.json({ error: "Reset failed" }, { status: 500 }) }

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ success: true, message: "Password updated. Please sign in again." })
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 404 })
}

// ─── PROFILE tier ─────────────────────────────────────────────────────────────

async function handleProfile(
  req: NextRequest,
  action: string,
  method: string,
  account: Account,
  parsed: Parsed
): Promise<NextResponse> {
  const url = req.nextUrl

  if (action === "signup" && method === "POST") {
    const body     = await parseBody(req)
    const email    = typeof body.email    === "string" ? body.email.toLowerCase().trim() : ""
    const password = typeof body.password === "string" ? body.password : ""

    const emailErr = validateEmail(email)
    if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 })
    const passErr = validatePassword(password)
    if (passErr) return NextResponse.json({ error: passErr }, { status: 400 })

    let result
    try { result = await signupAccount("profile", account.id, email, password) }
    catch { return NextResponse.json({ error: "Failed to create account" }, { status: 500 }) }

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

    let token: string | undefined
    try {
      const signinResult = await signinAccount("profile", account.id, email, password)
      if (signinResult.ok) token = signinResult.token
    } catch { /* non-fatal */ }

    const debug = makeDebugUrl(
      baseUrl(req),
      `/api/${parsed.locale}/${parsed.version}/auth/profile/verify-email`,
      result.verificationToken
    )

    return NextResponse.json({ success: true, token, account: result.account, debug }, { status: 201 })
  }

  if (action === "signin" && method === "POST") {
    const body     = await parseBody(req)
    const email    = typeof body.email    === "string" ? body.email.toLowerCase().trim() : ""
    const password = typeof body.password === "string" ? body.password : ""

    if (!email || !password) {
      return NextResponse.json({ error: "email and password are required" }, { status: 400 })
    }

    let result
    try { result = await signinAccount("profile", account.id, email, password) }
    catch { return NextResponse.json({ error: "Signin failed" }, { status: 500 }) }

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

    return NextResponse.json({ success: true, token: result.token, account: result.account })
  }

  if (action === "signout" && method === "POST") {
    const raw = bearerToken(req)
    if (!raw) return NextResponse.json({ error: "Authorization: Bearer <token> header required" }, { status: 401 })
    try { await signoutToken("profile", raw) }
    catch { return NextResponse.json({ error: "Signout failed" }, { status: 500 }) }
    return NextResponse.json({ success: true, message: "Token invalidated." })
  }

  if (action === "verify-email" && method === "GET") {
    const token = url.searchParams.get("token")
    if (!token) return NextResponse.json({ error: "token query param is required" }, { status: 400 })
    let result
    try { result = await verifyEmail("profile", account.id, token) }
    catch { return NextResponse.json({ error: "Verification failed" }, { status: 500 }) }
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ success: true, message: "Email verified." })
  }

  if (action === "forgot-password" && method === "POST") {
    const body  = await parseBody(req)
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : ""
    if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 })
    let resetToken: string | null = null
    try { resetToken = await initPasswordReset("profile", account.id, email) }
    catch { return NextResponse.json({ error: "Request failed" }, { status: 500 }) }
    const response: Record<string, unknown> = {
      message: "If that email is registered, a reset link has been sent.",
    }
    if (resetToken) {
      response.debug = makeDebugUrl(
        baseUrl(req),
        `/api/${parsed.locale}/${parsed.version}/auth/profile/reset-password`,
        resetToken
      )
    }
    return NextResponse.json(response)
  }

  if (action === "reset-password" && method === "POST") {
    const token    = url.searchParams.get("token")
    const body     = await parseBody(req)
    const password = typeof body.password === "string" ? body.password : ""
    if (!token) return NextResponse.json({ error: "token query param is required" }, { status: 400 })
    const passErr = validatePassword(password)
    if (passErr) return NextResponse.json({ error: passErr }, { status: 400 })
    let result
    try { result = await resetPassword("profile", account.id, token, password) }
    catch { return NextResponse.json({ error: "Reset failed" }, { status: 500 }) }
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ success: true, message: "Password updated. Please sign in again." })
  }

  // GET /auth/profile/me
  if (action === "me" && method === "GET") {
    const raw = bearerToken(req)
    if (!raw) return NextResponse.json({ error: "Authorization: Bearer <token> header required" }, { status: 401 })

    const tokenResult = await validatePracticeToken("profile", account.id, raw)
    if (!tokenResult.ok) return NextResponse.json({ error: tokenResult.error }, { status: tokenResult.status })

    let profile
    try { profile = await getOrCreateProfile(tokenResult.accountId) }
    catch { return NextResponse.json({ error: "Failed to load profile" }, { status: 500 }) }

    return NextResponse.json({ account: tokenResult.account, profile })
  }

  // PUT /auth/profile/me
  if (action === "me" && method === "PUT") {
    const raw = bearerToken(req)
    if (!raw) return NextResponse.json({ error: "Authorization: Bearer <token> header required" }, { status: 401 })

    const tokenResult = await validatePracticeToken("profile", account.id, raw)
    if (!tokenResult.ok) return NextResponse.json({ error: tokenResult.error }, { status: tokenResult.status })

    const body = await parseBody(req)
    const fields: Record<string, string> = {}

    if (typeof body.displayName === "string") {
      if (body.displayName.length > 80) return NextResponse.json({ error: "displayName max 80 chars" }, { status: 400 })
      fields.displayName = body.displayName
    }
    if (typeof body.bio === "string") {
      if (body.bio.length > 500) return NextResponse.json({ error: "bio max 500 chars" }, { status: 400 })
      fields.bio = body.bio
    }
    if (typeof body.avatarUrl === "string") {
      try { new URL(body.avatarUrl) } catch { return NextResponse.json({ error: "avatarUrl must be a valid URL" }, { status: 400 }) }
      fields.avatarUrl = body.avatarUrl
    }
    if (typeof body.location === "string") fields.location = body.location
    if (typeof body.website  === "string") {
      try { new URL(body.website) } catch { return NextResponse.json({ error: "website must be a valid URL" }, { status: 400 }) }
      fields.website = body.website
    }

    let profile
    try { profile = await updateProfile(tokenResult.accountId, fields) }
    catch { return NextResponse.json({ error: "Failed to update profile" }, { status: 500 }) }

    return NextResponse.json({ profile })
  }

  // DELETE /auth/profile/me
  if (action === "me" && method === "DELETE") {
    const raw = bearerToken(req)
    if (!raw) return NextResponse.json({ error: "Authorization: Bearer <token> header required" }, { status: 401 })

    const tokenResult = await validatePracticeToken("profile", account.id, raw)
    if (!tokenResult.ok) return NextResponse.json({ error: tokenResult.error }, { status: tokenResult.status })

    try { await deleteAccount("profile", tokenResult.accountId) }
    catch { return NextResponse.json({ error: "Failed to delete account" }, { status: 500 }) }

    return NextResponse.json({ success: true, message: "Account and profile deleted." })
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 404 })
}
