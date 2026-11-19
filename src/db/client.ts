import { mkdirSync } from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "./schema";

export type Db = LibSQLDatabase<typeof schema> & { $client: Client };

const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

/** Open a SQLite database file and bring its schema up to date. */
export async function openDb(filePath: string): Promise<Db> {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const client = createClient({ url: `file:${filePath}` });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db;
}

export function defaultDbPath(): string {
  // The data folder is chosen at runtime, so keep the bundler from tracing it.
  const dir = process.env.FOOTHOLD_DATA_DIR ?? "data";
  return path.join(path.resolve(/*turbopackIgnore: true*/ process.cwd(), dir), "foothold.db");
}

// Reuse one connection across hot reloads in dev.
const globalForDb = globalThis as unknown as { footholdDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  globalForDb.footholdDb ??= openDb(defaultDbPath());
  return globalForDb.footholdDb;
}
