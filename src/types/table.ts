// Stub type — full Zod schema definition is pending (see CLAUDE.md Task 1)

export type TableConfig = {
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
  /** DB column used to identify row ownership. Defaults to "user_id". */
  ownershipCol?: string
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

