import { describe, it, expect } from "vitest"
import {
  generateRawKey,
  hashKey,
  getPrefix,
  calcExpiresAt,
} from "@/lib/keys"

describe("generateRawKey", () => {
  it("starts with ak_", () => {
    expect(generateRawKey()).toMatch(/^ak_/)
  })

  it("generates unique keys", () => {
    const keys = new Set(Array.from({ length: 100 }, generateRawKey))
    expect(keys.size).toBe(100)
  })

  it("is at least 40 characters long", () => {
    expect(generateRawKey().length).toBeGreaterThanOrEqual(40)
  })
})

describe("hashKey", () => {
  it("returns a 64-char hex string (SHA-256)", () => {
    const h = hashKey("ak_test_key_value")
    expect(h).toMatch(/^[a-f0-9]{64}$/)
  })

  it("is deterministic", () => {
    expect(hashKey("ak_test")).toBe(hashKey("ak_test"))
  })

  it("different keys produce different hashes", () => {
    expect(hashKey("ak_a")).not.toBe(hashKey("ak_b"))
  })
})

describe("getPrefix", () => {
  it("returns ak_ + 8 hex chars (11 chars total)", () => {
    expect(getPrefix("ak_abcdefghijklmn")).toBe("ak_abcdefgh")
  })
})

describe("calcExpiresAt", () => {
  it("personal key expires 14 days from activation", () => {
    const now = new Date("2025-01-01T00:00:00Z")
    const expires = calcExpiresAt("personal", now)
    const diff = expires.getTime() - now.getTime()
    expect(diff).toBe(14 * 24 * 60 * 60 * 1000)
  })

  it("gift key expires 30 days from activation", () => {
    const now = new Date("2025-01-01T00:00:00Z")
    const expires = calcExpiresAt("gift", now)
    const diff = expires.getTime() - now.getTime()
    expect(diff).toBe(30 * 24 * 60 * 60 * 1000)
  })

  it("pool key expires N days from activation", () => {
    const now = new Date("2025-01-01T00:00:00Z")
    const expires = calcExpiresAt("pool", now, 60)
    const diff = expires.getTime() - now.getTime()
    expect(diff).toBe(60 * 24 * 60 * 60 * 1000)
  })
})
