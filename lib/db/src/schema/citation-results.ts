import { pgTable, text, serial, timestamp, jsonb, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { auditsTable } from "./audits";

export const aiModelEnum = pgEnum("ai_model", ["chatgpt", "claude", "gemini", "perplexity"]);

export const citationResultsTable = pgTable("citation_results", {
  id: serial("id").primaryKey(),
  auditId: integer("audit_id").references(() => auditsTable.id, { onDelete: "cascade" }).notNull(),
  query: text("query").notNull(),
  model: aiModelEnum("model").notNull(),
  mentioned: boolean("mentioned").notNull().default(false),
  position: integer("position"),
  competitors: jsonb("competitors").$type<Array<{ name: string; rank: number; url: string | null }>>().notNull().default([]),
  sources: jsonb("sources").$type<string[]>().notNull().default([]),
  excerpt: text("excerpt").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertCitationResultSchema = createInsertSchema(citationResultsTable).omit({ id: true, createdAt: true });
export type InsertCitationResult = z.infer<typeof insertCitationResultSchema>;
export type CitationResult = typeof citationResultsTable.$inferSelect;
