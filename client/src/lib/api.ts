import { toast } from "@/hooks/use-toast";
import { getTokenFromCookie, clearAuthCookies, isTokenExpired } from "@/lib/cookieUtils";
import { registerEndpointCall } from "@/lib/endpoint-tracker";

const API_BASE_URL = "/api/proxy";

export function getAuthHeaders(): HeadersInit {
  const token = getTokenFromCookie();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "accept": "application/json",
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    console.debug("[Auth] Token found, Authorization header set:", token.substring(0, 20) + "...");
  } else {
    console.warn("[Auth] No token found in cookies!");
  }
  
  return headers;
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
  const method = options.method || "GET";
  
  // Check if token is expired before making request
  if (isTokenExpired()) {
    console.error("[API] Token has expired, clearing auth and redirecting to login");
    clearAuthCookies();
    setTimeout(() => {
      window.location.href = "/login";
    }, 300);
    throw new Error("Сеанс закінчився. Будь ласка, увійдіть знову.");
  }
  
  // Register endpoint call for developer view
  registerEndpointCall(endpoint, method, options.body);
  
  try {
    console.log(`[API] ${method} ${url}`);
    
    const auth = getAuthHeaders();
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
      ...auth,
    };
    
    console.log(`[API] Request headers:`, {
      method,
      url,
      hasAuthHeader: !!headers["Authorization"],
      authHeaderPreview: headers["Authorization"] ? headers["Authorization"].substring(0, 30) + "..." : "MISSING",
    });
    
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Log response status
    console.log(`[API] Response status: ${response.status} ${response.statusText} for ${url}`);

    if (!response.ok) {
      let errorData;
      try {
        const text = await response.text();
        errorData = text ? JSON.parse(text) : { message: "Помилка запиту" };
      } catch (parseError) {
        console.error(`[API Error] Failed to parse error response for ${url}:`, parseError);
        errorData = { message: `Помилка ${response.status}: ${response.statusText}` };
      }
      
      const errorMessage = errorData?.message || `Помилка ${response.status}`;
      console.error(`[API Error] ${options.method || "GET"} ${url}:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        message: errorMessage,
      });
      
      // Handle 401 Unauthorized - token likely expired
      if (response.status === 401) {
        console.error("[API] 401 Unauthorized - clearing auth cookies and redirecting to login");
        clearAuthCookies();
        // Force page reload to redirect to login
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        throw new Error("Сеанс закінчився. Будь ласка, увійдіть знову.");
      }
      
      const title = response.status === 401 ? "Немає доступу" : "Помилка запиту";
      toast({ variant: "destructive", title, description: errorMessage });
      throw new Error(errorMessage);
    }

    // Handle response parsing
    try {
      const text = await response.text();
      if (!text) {
        console.warn(`[API] Empty response body for ${url}`);
        return null as T;
      }
      
      const data = JSON.parse(text);
      console.log(`[API] Success response for ${url}:`, Array.isArray(data) ? `Array(${data.length})` : "Object");
      return data as T;
    } catch (parseError) {
      console.error(`[API Error] Failed to parse response for ${url}:`, parseError);
      throw new Error("Не вдалося обробити відповідь сервера");
    }
  } catch (error: any) {
    // Log network errors
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      console.error(`[API Error] Network error for ${url}:`, {
        error: error.message,
        message: "Не вдалося з'єднатися з сервером. Перевірте підключення до інтернету.",
      });
      throw new Error("Не вдалося з'єднатися з сервером. Перевірте підключення до інтернету.");
    }
    
    // Re-throw if it's already our Error with message
    if (error instanceof Error) {
      console.error(`[API Error] Request failed for ${url}:`, error);
      throw error;
    }
    
    console.error(`[API Error] Unknown error for ${url}:`, error);
    throw new Error(error?.message || "Невідома помилка при виконанні запиту");
  }
}