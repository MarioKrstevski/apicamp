import { NextRequest, NextResponse } from "next/server"
import type { Account } from "@/lib/auth"

type AuthParsed = {
  tail: string[]
  behaviors: string[]
  locale: string
  version: string
}

export async function handleAuthRequest(
  _req: NextRequest,
  parsed: AuthParsed,
  _account: Account,
  method: string
): Promise<NextResponse> {
  const tier   = parsed.tail[1]
  const action = parsed.tail[2]

  return NextResponse.json(
    { error: `Auth endpoint not yet implemented: ${tier ?? "?"}/${action ?? "?"} [${method}]` },
    { status: 501 }
  )
}
