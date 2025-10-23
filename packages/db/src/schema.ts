import { pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  name: text("name"),
  bio: text("bio"),
  achievemts: text("achievemts"),
  avatarUrl: text("avatar_url"),
  region: text("region"),
  timezone: text("timezone"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

export const interactions = pgTable("interactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorUser: uuid("actor_user").notNull(),
  targetUser: uuid("target_user").notNull(),
  action: text("action").notNull(), // 'like' | 'pass' | 'block'
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});