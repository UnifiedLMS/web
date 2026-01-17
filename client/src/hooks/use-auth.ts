import { useMutation, useQuery } from "@tanstack/react-query";
import { api, type LoginRequest, type AuthResponse } from "@shared/routes";
import { queryClient } from "@/lib/queryClient";
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
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        if (res.status === 401) throw new Error("Невірний логін або пароль");
        if (res.status === 403) throw new Error(error.message || "У вас немає прав адміністратора");
        throw new Error(error.message || "Помилка сервера. Спробуйте пізніше.");
      }

      return (await res.json()) as AuthResponse;
    },
    onSuccess: (data) => {
      localStorage.setItem("unified_token", data.access_token);
      localStorage.setItem("unified_user", JSON.stringify(data));
      queryClient.setQueryData(["/api/user"], data);
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

      const data = (await res.json()) as AuthResponse;
      return data;
    },
    onSuccess: (data) => {
      localStorage.setItem("unified_user", JSON.stringify(data));
      queryClient.setQueryData(["/api/user"], data);
    }
  });
}

export function useUser() {
  return useQuery<AuthResponse | null>({
    queryKey: ["/api/user"],
    queryFn: () => {
      const saved = localStorage.getItem("unified_user");
      return saved ? JSON.parse(saved) : null;
    },
    staleTime: Infinity,
  });
}

export function useLogout() {
  const [, setLocation] = useLocation();
  const { data: user } = useUser();

  const logout = async () => {
    const token = localStorage.getItem("unified_token");
    if (token) {
      try {
        await fetch("https://unifyapi.onrender.com/api/v1/auth/logout", {
          method: "POST",
          headers: {
            "access-token": token,
            "token-type": "bearer"
          }
        });
      } catch (e) {
        console.error("[LogOut] Logout request failed:", e);
      }
    }
    localStorage.removeItem("unified_token");
    localStorage.removeItem("unified_user");
    queryClient.setQueryData(["/api/user"], null);
    setLocation("/login");
  };

  return { logout, user };
}
