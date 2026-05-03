import { pgTable, text, serial, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const trackedQueriesTable = pgTable("tracked_queries", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull(),
  domain: text("domain").notNull(),
  queries: jsonb("queries").$type<string[]>().notNull(),
  email: text("email").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertTrackedQueriesSchema = createInsertSchema(trackedQueriesTable).omit({ id: true, createdAt: true });
export type InsertTrackedQueries = z.infer<typeof insertTrackedQueriesSchema>;
export type TrackedQuery = typeof trackedQueriesTable.$inferSelect;
