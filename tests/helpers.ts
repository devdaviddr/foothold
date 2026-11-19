import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { openDb, type Db } from "@/db/client";

/** A fresh, migrated database in a temp folder. Call cleanup() when done. */
export async function tempDb(): Promise<{ db: Db; cleanup: () => void }> {
  const dir = mkdtempSync(path.join(tmpdir(), "foothold-test-"));
  const db = await openDb(path.join(dir, "test.db"));
  return {
    db,
    cleanup: () => {
      db.$client.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
