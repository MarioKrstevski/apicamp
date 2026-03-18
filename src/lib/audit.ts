// Stub — logs to console until a proper audit table is set up.
export async function logAudit(userId: string, method: string, table: string, rowId: string) {
  console.info(`[audit] ${method} ${table}/${rowId} by ${userId}`)
}
