import { pgTable, text, serial, timestamp, jsonb, integer, uuid } from "drizzle-orm/pg-core";

export const sharedResultsTable = pgTable("shared_results", {
  id: serial("id").primaryKey(),
  token: uuid("token").defaultRandom().notNull().unique(),
  url: text("url").notNull(),
  category: text("category").notNull(),
  aiVisibilityScore: integer("ai_visibility_score").notNull(),
  semanticDensityScore: integer("semantic_density_score").notNull(),
  structuralFormattingScore: integer("structural_formatting_score").notNull(),
  weaknesses: jsonb("weaknesses").$type<string[]>().notNull(),
  competitorPatterns: jsonb("competitor_patterns").$type<string[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type SharedResult = typeof sharedResultsTable.$inferSelect;
