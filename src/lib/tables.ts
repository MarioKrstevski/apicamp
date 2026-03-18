import registry from "@/config/registry"
import type { TableConfig } from "@/types/category"

export function getTableConfig(table: string): TableConfig | null {
  return registry[table] ?? null
}
