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
  access_token: z.string().optional(),
  role: z.string().optional(),
  username: z.string().optional(),
  // Some APIs return these alternative field names
  token: z.string().optional(),
  user_role: z.string().optional(),
  userRole: z.string().optional(),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type User = {
  username: string;
  role: string;
};

// Helper to extract role from various possible field names in API response
export function extractRole(data: any): string | undefined {
  if (!data) return undefined;
  return data.role || data.user_role || data.userRole || undefined;
}

// Helper to extract token from various possible field names in API response
export function extractToken(data: any): string | undefined {
  if (!data) return undefined;
  return data.access_token || data.token || undefined;
}
