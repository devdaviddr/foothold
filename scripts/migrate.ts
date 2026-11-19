import { defaultDbPath, openDb } from "../src/db/client";

// The app also migrates on first use; this script is for doing it up front.
const file = defaultDbPath();
await openDb(file);
console.log(`Database is up to date: ${file}`);
