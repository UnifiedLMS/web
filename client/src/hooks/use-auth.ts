import { useMutation, useQuery } from "@tanstack/react-query";
import { api, type LoginRequest, type AuthResponse, extractRole, extractToken } from "@shared/routes";
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

  const handleAuthSuccess = (data: AuthResponse, tokenOverride?: string) => {
    const tokenToStore = extractToken(data) || tokenOverride;
    const role = extractRole(data);
    
    console.log("[Auth] Login role detected:", role, "from data:", data);
    
    // Verify role exists before proceeding
    if (!role) {
      console.error("[Auth] No role found in response, login rejected");
      throw new Error("Не вдалося визначити роль користувача");
    }
    
    // Store token only after validation
    if (tokenToStore) {
      localStorage.setItem("unified_token", tokenToStore);
    } else {
      console.error("[Auth] No token found in response");
      throw new Error("Не вдалося отримати токен авторизації");
    }
    
    // Store user data with normalized role
    const userData = { ...data, role: role };
    localStorage.setItem("unified_user", JSON.stringify(userData));
    queryClient.setQueryData(["/api/user"], userData);

    // Redirect based on verified role
    if (role === "students" || role === "student") {
      setLocation("/student");
    } else if (role === "teachers" || role === "teacher") {
      setLocation("/teacher");
    } else if (role === "admins" || role === "admin") {
      setLocation("/dashboard");
    } else {
      console.warn("[Auth] Unknown role, redirecting to login:", role);
      localStorage.removeItem("unified_token");
      localStorage.removeItem("unified_user");
      throw new Error(`Невідома роль користувача: ${role}`);
    }
  };

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
            errorMessage = errorData.message || "Недостатньо прав для входу";
          }
          
          console.error(`[Auth] Login failed:`, { status: res.status, error: errorData, message: errorMessage });
          throw new Error(errorMessage);
        }

        const data = (await res.json()) as AuthResponse;
        
        // Validate response has required fields
        const token = extractToken(data);
        const role = extractRole(data);
        
        if (!token) {
          console.error("[Auth] Response missing token");
          throw new Error("Сервер не повернув токен авторизації");
        }
        
        if (!role) {
          console.error("[Auth] Response missing role");
          throw new Error("Сервер не повернув роль користувача");
        }
        
        console.log("[Auth] Login successful, role:", role);
        return data;
      } catch (error: any) {
        console.error("[Auth] Login error:", error);
        if (error instanceof TypeError && error.message === "Failed to fetch") {
          throw new Error("Не вдалося з'єднатися з сервером. Перевірте підключення до інтернету.");
        }
        throw error;
      }
    },
    onSuccess: (data) => handleAuthSuccess(data),
  });
}

export function useTokenLogin() {
  const [, setLocation] = useLocation();
  const timeoutMs = 12000;

  const handleAuthSuccess = (data: AuthResponse, tokenOverride?: string, roleHint?: string) => {
    const tokenToStore = extractToken(data) || tokenOverride;
    
    // Use roleHint if server response doesn't include a role
    const role = extractRole(data) || roleHint;
    console.log("[Auth] Token login role:", role, "from data:", extractRole(data), "hint:", roleHint);
    
    // Verify role exists before proceeding
    if (!role) {
      console.error("[Auth] No role found in response or hint, login rejected");
      throw new Error("Не вдалося визначити роль користувача");
    }
    
    // Store token only after validation
    if (tokenToStore) {
      localStorage.setItem("unified_token", tokenToStore);
    } else {
      console.error("[Auth] No token found");
      throw new Error("Не вдалося отримати токен авторизації");
    }
    
    // Store user data with role (use roleHint if data.role is missing)
    const userData = { ...data, role: role };
    localStorage.setItem("unified_user", JSON.stringify(userData));
    queryClient.setQueryData(["/api/user"], userData);
    
    // Redirect based on verified role
    if (role === "students" || role === "student") {
      setLocation("/student");
    } else if (role === "teachers" || role === "teacher") {
      setLocation("/teacher");
    } else if (role === "admins" || role === "admin") {
      setLocation("/dashboard");
    } else {
      console.warn("[Auth] Unknown role, redirecting to login:", role);
      localStorage.removeItem("unified_token");
      localStorage.removeItem("unified_user");
      throw new Error(`Невідома роль користувача: ${role}`);
    }
  };

  return useMutation({
    mutationFn: async (input: string | { token: string; roleHint?: string }): Promise<{ data: AuthResponse; token: string; roleHint?: string }> => {
      const token = typeof input === "string" ? input : input.token;
      const roleHint = typeof input === "string" ? undefined : input.roleHint;
      try {
        console.log("[Auth] Attempting token login, roleHint:", roleHint);
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(api.auth.checkToken.path, {
          method: api.auth.checkToken.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
          signal: controller.signal,
        });
        window.clearTimeout(timeoutId);

        console.log(`[Auth] Token login response status: ${res.status}`);

        if (!res.ok) {
          let errorData;
          try {
            const text = await res.text();
            errorData = text ? JSON.parse(text) : {};
          } catch (parseError) {
            console.error("[Auth] Failed to parse token login error response:", parseError);
            errorData = {};
          }

          const errorMessage = errorData?.message || "Не вдалося увійти за токеном";
          console.error(`[Auth] Token login failed:`, { status: res.status, error: errorData, message: errorMessage });
          throw new Error(errorMessage);
        }

        const data = (await res.json()) as AuthResponse;
        
        // Validate response - need either role from data or from hint
        const responseRole = extractRole(data);
        if (!responseRole && !roleHint) {
          console.error("[Auth] Token login response missing role and no hint provided");
          throw new Error("Сервер не повернув роль користувача");
        }
        
        console.log("[Auth] Token login successful, data:", data);
        return { data, token, roleHint };
      } catch (error: any) {
        console.error("[Auth] Token login error:", error);
        if (error?.name === "AbortError") {
          throw new Error("Час очікування вичерпано. Спробуйте ще раз.");
        }
        if (error instanceof TypeError && error.message === "Failed to fetch") {
          throw new Error("Не вдалося з'єднатися з сервером. Перевірте підключення до інтернету.");
        }
        throw error;
      }
    },
    onSuccess: (result) => {
      console.log("[Auth] onSuccess called with:", result);
      handleAuthSuccess(result.data, result.token, result.roleHint);
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
        console.log("[Auth] Token valid, data:", data);
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
      // Update token if a new one is returned (token exchange)
      const newToken = extractToken(data);
      if (newToken) {
        console.log("[Auth] New token received, updating stored token");
        localStorage.setItem("unified_token", newToken);
      }
      
      // Normalize role from various possible field names
      const role = extractRole(data);
      console.log("[Auth] Token check role:", role);
      
      const userData = { ...data, role: role };
      localStorage.setItem("unified_user", JSON.stringify(userData));
      queryClient.setQueryData(["/api/user"], userData);
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
