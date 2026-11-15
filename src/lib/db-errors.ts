// 23503 = foreign_key_violation (NO ACTION). 23001 = restrict_violation, which is
// what Postgres raises for FKs declared ON DELETE RESTRICT ("violates RESTRICT
// setting of foreign key constraint").
const FOREIGN_KEY_CODES = ["23503", "23001"];

// True when a Postgres error is a foreign key violation. Drizzle wraps driver
// errors, so the code can sit on the error or on its `cause`.
export function isForeignKeyViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { code, cause } = error as { code?: unknown; cause?: unknown };
  return (
    (typeof code === "string" && FOREIGN_KEY_CODES.includes(code)) ||
    (cause !== undefined && isForeignKeyViolation(cause))
  );
}
