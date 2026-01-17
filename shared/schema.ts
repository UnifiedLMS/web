import { pgTable, text, serial, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// We keep a local users table for future extensibility, 
// though currently we auth against an external API.
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  role: text("role").default("student"),
});

export const insertUserSchema = createInsertSchema(users);

// === EXTERNAL API TYPES ===
// These match the C# Unity implementation

export const loginRequestSchema = z.object({
  username: z.string().min(8, "Код ЄДЕБО повинен містити щонайменше 8 символів"),
  password: z.string().min(1, "Введіть пароль"),
});

export const tokenCheckSchema = z.object({
  token: z.string(),
});

export const authResponseSchema = z.object({
  access_token: z.string(),
  role: z.string(),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type User = typeof users.$inferSelect;
