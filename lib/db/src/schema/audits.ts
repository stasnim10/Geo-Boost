import { pgTable, text, serial, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const auditsTable = pgTable("audits", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull(),
  url: text("url").notNull(),
  category: text("category").notNull(),
  queries: jsonb("queries").$type<string[]>().notNull(),
  location: text("location"),
  aiVisibilityScore: integer("ai_visibility_score").notNull(),
  semanticDensityScore: integer("semantic_density_score").notNull(),
  structuralFormattingScore: integer("structural_formatting_score").notNull(),
  weaknesses: jsonb("weaknesses").$type<string[]>().notNull(),
  competitorPatterns: jsonb("competitor_patterns").$type<string[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertAuditSchema = createInsertSchema(auditsTable).omit({ id: true, createdAt: true });
export type InsertAudit = z.infer<typeof insertAuditSchema>;
export type Audit = typeof auditsTable.$inferSelect;
