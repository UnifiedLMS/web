const API_BASE_URL = "/api/proxy";

export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("unified_token");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  return headers;
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  try {
    console.log(`[API] ${options.method || "GET"} ${url}`);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
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