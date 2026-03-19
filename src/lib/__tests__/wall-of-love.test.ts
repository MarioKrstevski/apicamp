import { describe, it, expect } from "vitest"
import { getInitials, getAvatarColor, shuffle, AVATAR_COLORS } from "@/lib/wall-of-love"

describe("getInitials", () => {
  it("returns first letter of each word, max 2 chars", () => {
    expect(getInitials("Alice Walker")).toBe("AW")
  })
  it("handles single name", () => {
    expect(getInitials("Alice")).toBe("A")
  })
  it("handles more than 2 words — takes first 2 initials only", () => {
    expect(getInitials("Alice B Walker")).toBe("AB")
  })
  it("returns ? for null", () => {
    expect(getInitials(null)).toBe("?")
  })
  it("returns ? for empty string", () => {
    expect(getInitials("")).toBe("?")
  })
})

describe("getAvatarColor", () => {
  it("returns a string from AVATAR_COLORS", () => {
    const color = getAvatarColor("some-user-id")
    expect(AVATAR_COLORS).toContain(color)
  })
  it("is deterministic — same userId always gives same color", () => {
    expect(getAvatarColor("abc")).toBe(getAvatarColor("abc"))
  })
  it("different userIds can produce different colors", () => {
    const colors = new Set(
      ["a", "b", "c", "d", "e", "f", "g"].map(getAvatarColor)
    )
    expect(colors.size).toBeGreaterThan(1)
  })
})

describe("shuffle", () => {
  it("returns same elements", () => {
    const arr = [1, 2, 3, 4, 5]
    expect(shuffle(arr).sort()).toEqual([1, 2, 3, 4, 5])
  })
  it("does not mutate original array", () => {
    const arr = [1, 2, 3]
    const original = [...arr]
    shuffle(arr)
    expect(arr).toEqual(original)
  })
  it("returns array of same length", () => {
    expect(shuffle([1, 2, 3])).toHaveLength(3)
  })
})
