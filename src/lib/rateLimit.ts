// Stub — pending implementation (see CLAUDE.md task list)

export type RateLimitResult = { resetAt: string } | null

export async function checkRateLimit(_account: unknown): Promise<RateLimitResult> {
  throw new Error("checkRateLimit not implemented yet")
}
