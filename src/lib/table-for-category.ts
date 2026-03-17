/**
 * Platform tables: real DB tables (products, users) that we create and seed.
 * Served by the API; paid customers use these as demo endpoints.
 * Other categories (future, or user-created) live in user_rows with a category column.
 */
const PLATFORM_TABLES = ['products', 'users'] as const

export type TableForCategoryResult =
  | { table: typeof PLATFORM_TABLES[number]; isPlatformTable: true }
  | { table: 'user_rows'; isPlatformTable: false }

export function getTableForCategory(category: string): TableForCategoryResult {
  if (PLATFORM_TABLES.includes(category as typeof PLATFORM_TABLES[number])) {
    return { table: category as typeof PLATFORM_TABLES[number], isPlatformTable: true }
  }
  return { table: 'user_rows', isPlatformTable: false }
}
