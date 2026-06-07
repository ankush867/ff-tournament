import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const matchesTable = pgTable("matches", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type", { enum: ["solo", "duo", "squad"] }).notNull(),
  status: text("status", { enum: ["upcoming", "live", "completed"] }).notNull().default("upcoming"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  entryFee: integer("entry_fee").notNull(),
  maxPlayers: integer("max_players").notNull().default(18),
  roomId: text("room_id"),
  roomPassword: text("room_password"),
  prizePool: text("prize_pool"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMatchSchema = createInsertSchema(matchesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matchesTable.$inferSelect;
