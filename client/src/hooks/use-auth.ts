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
      try {
        console.log("[Auth] Attempting login for user:", credentials.username);
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

        console.log(`[Auth] Login response status: ${res.status}`);

      if (!res.ok) {
          let errorData;
          try {
            const text = await res.text();
            errorData = text ? JSON.parse(text) : {};
          } catch (parseError) {
            console.error("[Auth] Failed to parse login error response:", parseError);
            errorData = {};
          }
          
          let errorMessage = errorData?.message || "Помилка сервера. Спробуйте пізніше.";
          if (res.status === 401) {
            errorMessage = "Невірний логін або пароль";
          } else if (res.status === 403) {
            errorMessage = errorData.message || "У вас немає прав адміністратора";
          }
          
          console.error(`[Auth] Login failed:`, { status: res.status, error: errorData, message: errorMessage });
          throw new Error(errorMessage);
      }

        const data = (await res.json()) as AuthResponse;
        console.log("[Auth] Login successful");
        return data;
      } catch (error: any) {
        console.error("[Auth] Login error:", error);
        if (error instanceof TypeError && error.message === "Failed to fetch") {
          throw new Error("Не вдалося з'єднатися з сервером. Перевірте підключення до інтернету.");
        }
        throw error;
      }
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
      try {
        console.log("[Auth] Checking token validity");
      const res = await fetch(api.auth.checkToken.path, {
        method: api.auth.checkToken.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

        console.log(`[Auth] Token check response status: ${res.status}`);

      if (!res.ok) {
          let errorData;
          try {
            const text = await res.text();
            errorData = text ? JSON.parse(text) : {};
          } catch (parseError) {
            console.error("[Auth] Failed to parse token check error response:", parseError);
            errorData = {};
          }
          
          const errorMessage = errorData?.message || "Token invalid";
          console.error(`[Auth] Token check failed:`, { status: res.status, error: errorData });
          throw new Error(errorMessage);
      }

      const data = (await res.json()) as AuthResponse;
        console.log("[Auth] Token valid");
      return data;
      } catch (error: any) {
        console.error("[Auth] Token check error:", error);
        if (error instanceof TypeError && error.message === "Failed to fetch") {
          throw new Error("Не вдалося з'єднатися з сервером. Перевірте підключення до інтернету.");
        }
        throw error;
      }
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
        console.log("[Auth] Attempting logout");
        // Note: Logout endpoint might need special handling, but for now we'll just log
        // The logout is mostly client-side anyway (clearing local storage)
      } catch (e) {
        console.error("[Auth] Logout request failed:", e);
      }
    }
    localStorage.removeItem("unified_token");
    localStorage.removeItem("unified_user");
    queryClient.setQueryData(["/api/user"], null);
    setLocation("/login");
  };

  return { logout, user };
}
