import { useMutation } from "@tanstack/react-query";
import { api, type LoginRequest, type AuthResponse } from "@shared/routes";
import { useLocation } from "wouter";

// Helper to update CSS variable for primary color
export function setPrimaryColor(color: string) {
  // Simple RGB parser/converter could go here, for now assuming HSL or RGB string provided by picker
  // But requirement says store 0, 170, 255.
  // We'll trust the user/picker to give us a valid value or handle it in the component.
}

export function useLogin() {
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      // Mocking the proxy call structure for frontend generation as requested
      // In a real scenario, this would hit the actual backend endpoint
      // Using the path from shared/routes.ts
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error("Невірний логін або пароль");
        throw new Error("Помилка сервера. Спробуйте пізніше.");
      }

      return (await res.json()) as AuthResponse;
    },
    onSuccess: (data) => {
      localStorage.setItem("unified_token", data.access_token);
      localStorage.setItem("unified_role", data.role);
      setLocation("/dashboard");
    },
  });
}

export function useCheckToken() {
  return useMutation({
    mutationFn: async (token: string) => {
      const res = await fetch(api.auth.checkToken.path, {
        method: api.auth.checkToken.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        throw new Error("Token invalid");
      }

      return (await res.json()) as AuthResponse;
    },
  });
}

export function useLogout() {
  const [, setLocation] = useLocation();

  const logout = () => {
    localStorage.removeItem("unified_token");
    localStorage.removeItem("unified_role");
    setLocation("/login");
  };

  return { logout };
}
