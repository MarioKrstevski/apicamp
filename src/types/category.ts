// Stub type — full Zod schema definition is pending (see CLAUDE.md Task 1)

export type CategoryConfig = {
  name: string
  label: string
  description?: string
  icon?: string
  locale?: boolean
  localeFields?: string[]
  versioning?: boolean
  searchable?: string[] | boolean
  allowUserRows?: boolean
  fileUpload?: boolean
  versions: Record<string, string[]>
  fields: Record<string, { auto?: boolean } & Record<string, unknown>>
  sortable?: string[]
  filterable?: string[]
  maxUserRows?: number
  modifiers?: string[]
  seedCount?: number
  queryParams?: Record<string, unknown>
  docs?: Record<string, unknown>
}
