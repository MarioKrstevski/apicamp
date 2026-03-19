import { describe, it, expect } from "vitest"
import {
  hashPassword,
  verifyPassword,
  generateToken,
  hashToken,
  generateUrlToken,
  makeDebugUrl,
  validateEmail,
  validatePassword,
} from "@/lib/auth-practice"

describe("hashPassword / verifyPassword", () => {
  it("produces a salt:hash string", async () => {
    const hash = await hashPassword("hunter2!")
    expect(hash).toMatch(/^[a-f0-9]+:[a-f0-9]+$/)
  })

  it("verifies a correct password", async () => {
    const hash = await hashPassword("hunter2!")
    expect(await verifyPassword("hunter2!", hash)).toBe(true)
  })

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("hunter2!")
    expect(await verifyPassword("wrong", hash)).toBe(false)
  })

  it("two hashes of the same password are different (salt)", async () => {
    const a = await hashPassword("hunter2!")
    const b = await hashPassword("hunter2!")
    expect(a).not.toBe(b)
  })

  it("returns false for a malformed stored value", async () => {
    expect(await verifyPassword("anything", "notahash")).toBe(false)
  })
})

describe("generateToken", () => {
  it("starts with tok_", () => {
    expect(generateToken()).toMatch(/^tok_/)
  })

  it("is 68 characters long (tok_ + 64 hex)", () => {
    expect(generateToken()).toHaveLength(68)
  })

  it("is unique across 100 calls", () => {
    const tokens = new Set(Array.from({ length: 100 }, generateToken))
    expect(tokens.size).toBe(100)
  })
})

describe("hashToken", () => {
  it("returns a 64-char hex SHA-256", () => {
    expect(hashToken("tok_abc")).toMatch(/^[a-f0-9]{64}$/)
  })

  it("is deterministic", () => {
    expect(hashToken("tok_abc")).toBe(hashToken("tok_abc"))
  })
})

describe("generateUrlToken", () => {
  it("is a 48-char hex string", () => {
    expect(generateUrlToken()).toMatch(/^[a-f0-9]{48}$/)
  })
})

describe("makeDebugUrl", () => {
  it("includes the token in the url", () => {
    const d = makeDebugUrl("https://apicamp.dev", "/api/en/v1/auth/basic/verify-email", "abc")
    expect(d.url).toBe("https://apicamp.dev/api/en/v1/auth/basic/verify-email?token=abc")
    expect(d.note).toBeTruthy()
  })
})

describe("validateEmail", () => {
  it("accepts valid emails", () => {
    expect(validateEmail("alice@example.com")).toBeNull()
  })

  it("rejects missing @", () => {
    expect(validateEmail("notanemail")).not.toBeNull()
  })

  it("rejects empty string", () => {
    expect(validateEmail("")).not.toBeNull()
  })
})

describe("validatePassword", () => {
  it("accepts 8+ char password", () => {
    expect(validatePassword("hunter2!")).toBeNull()
  })

  it("rejects under 8 chars", () => {
    expect(validatePassword("short")).not.toBeNull()
  })

  it("rejects over 72 chars", () => {
    expect(validatePassword("a".repeat(73))).not.toBeNull()
  })
})
