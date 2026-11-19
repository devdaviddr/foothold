import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  goal: text("goal").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

/**
 * One row per provider. The API key lives only in this local SQLite file and is
 * never returned to the browser; the UI only ever sees a masked version.
 */
export const providerKeys = sqliteTable("provider_keys", {
  provider: text("provider").primaryKey(),
  apiKey: text("api_key").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

/** Small key/value store for app settings (main provider, model choices, judge). */
export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type Project = typeof projects.$inferSelect;
