import { pgTable, text, serial, timestamp, index } from "drizzle-orm/pg-core";

export const freeTierAuditLogTable = pgTable(
  "free_tier_audit_log",
  {
    id: serial("id").primaryKey(),
    domain: text("domain").notNull(),
    clerkUserId: text("clerk_user_id"), // null for anonymous users
    clientIp: text("client_ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("free_tier_audit_log_domain_clerk_idx").on(t.domain, t.clerkUserId, t.createdAt),
    index("free_tier_audit_log_domain_ip_idx").on(t.domain, t.clientIp, t.createdAt),
  ],
);
