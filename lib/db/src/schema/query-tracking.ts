import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";

export const queryTrackingTable = pgTable("query_tracking", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull(),
  domain: text("domain").notNull(),
  query: text("query").notNull(),
  cited: boolean("cited").notNull().default(false),
  confidence: text("confidence").notNull().default("low"),
  reason: text("reason").notNull().default(""),
  suggestion: text("suggestion").notNull().default(""),
  checkedAt: timestamp("checked_at", { withTimezone: true }).defaultNow().notNull(),
});

export type QueryTracking = typeof queryTrackingTable.$inferSelect;
