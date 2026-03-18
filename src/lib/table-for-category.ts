// Every API resource maps directly to a DB table of the same name.
// "user_rows" is the only exception — it's a special table for user-created
// All other resources (users, cats, products…) have their own dedicated tables.

export function getTable(resource: string): string {
  return resource
}
