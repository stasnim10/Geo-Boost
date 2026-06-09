import { pgTable, text, serial, timestamp, unique } from "drizzle-orm/pg-core";

export const monitorReportLogsTable = pgTable("monitor_report_logs", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull(),
  weekKey: text("week_key").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
  status: text("status").notNull().default("success"),
}, (table) => [
  unique("monitor_report_logs_user_week_unique").on(table.clerkUserId, table.weekKey),
]);

export type MonitorReportLog = typeof monitorReportLogsTable.$inferSelect;
