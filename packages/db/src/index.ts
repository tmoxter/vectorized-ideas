import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
export * as schema from "./schema.js";

export function makeDb(connectionString: string) {
  // single pool per serverless invocation for now, maybe later: pgbouncer
  const client = postgres(connectionString, { prepare: false, max: 1 });
  return drizzle(client);
}