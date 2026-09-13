import { pgTable, text, serial, timestamp, jsonb, index } from "drizzle-orm/pg-core";

export const eventsTable = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    event: text("event").notNull(),
    properties: jsonb("properties").$type<Record<string, unknown>>().default({}),
    sessionId: text("session_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("events_event_idx").on(t.event, t.createdAt),
    index("events_session_idx").on(t.sessionId),
  ],
);
