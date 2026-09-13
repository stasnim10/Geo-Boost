import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Stripe retries delivery until it receives a 2xx response. Persisting event IDs
 * makes webhook delivery safe to replay without re-provisioning an account.
 */
export const stripeWebhookEventsTable = pgTable("stripe_webhook_events", {
  eventId: text("event_id").primaryKey(),
  eventType: text("event_type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow().notNull(),
});