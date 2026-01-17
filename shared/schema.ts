import { z } from "zod";

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
  username: z.string().optional(),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type User = {
  username: string;
  role: string;
};
