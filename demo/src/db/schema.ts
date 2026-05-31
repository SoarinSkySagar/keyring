import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const spells = pgTable("spells", {
  phrase: text("phrase").primaryKey(),
  secret: text("secret").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
