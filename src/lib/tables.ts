import registry from "@/config/registry"
import type { TableConfig } from "@/types/table"

export function getTableConfig(table: string): TableConfig | null {
  return registry[table] ?? null
}
