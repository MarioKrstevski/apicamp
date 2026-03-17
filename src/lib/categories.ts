import registry from "@/config/registry"
import type { CategoryConfig } from "@/types/category"

export function getCategoryConfig(category: string): CategoryConfig | null {
  return registry[category] ?? null
}
