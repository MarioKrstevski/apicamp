// Stub — pending implementation (see CLAUDE.md task list)

export type ValidateFieldsResult = {
  valid: boolean
  errors?: string[]
}

export function validateFields(
  _body: unknown,
  _fields: unknown,
  _opts?: { partial?: boolean }
): ValidateFieldsResult {
  throw new Error("validateFields not implemented yet")
}
