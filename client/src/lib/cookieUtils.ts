/**
 * Cookie utilities for authentication token and role management
 * Uses HTTP cookies instead of localStorage for better security
 */

const TOKEN_COOKIE_NAME = "unified_token";
const ROLE_COOKIE_NAME = "unified_role";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Parse cookies from document.cookie string
 */
function parseCookies(): Record<string, string> {
  const cookieString = document.cookie || "";
  if (!cookieString) return {};

  return cookieString.split(";").reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rest] = part.split("=");
    if (!rawKey) return acc;
    const key = rawKey.trim();
    const value = rest.join("=").trim();
    if (!key) return acc;
    acc[key] = decodeURIComponent(value || "");
    return acc;
  }, {});
}

/**
 * Get the authentication token from cookies
 */
export function getTokenFromCookie(): string | undefined {
  const cookies = parseCookies();
  const token = cookies[TOKEN_COOKIE_NAME] || undefined;
  
  if (token) {
    console.debug("[Cookie] Token retrieved:", token.substring(0, 20) + "...");
  } else {
    console.warn("[Cookie] No token found. Available cookies:", Object.keys(cookies));
  }
  
  return token;
}

/**
 * Get the user role from cookies
 */
export function getRoleFromCookie(): string | undefined {
  const cookies = parseCookies();
  return cookies[ROLE_COOKIE_NAME] || undefined;
}

/**
 * Set the authentication token in cookies
 * @param token - The token to store
 */
export function setTokenCookie(token: string): void {
  document.cookie = `${TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Strict`;
}

/**
 * Set the user role in cookies
 * @param role - The role to store
 */
export function setRoleCookie(role: string): void {
  document.cookie = `${ROLE_COOKIE_NAME}=${encodeURIComponent(role)}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Strict`;
}

/**
 * Set both token and role in cookies
 */
export function setAuthCookies(token: string, role: string): void {
  setTokenCookie(token);
  setRoleCookie(role);
}

/**
 * Clear the authentication token from cookies
 */
export function clearTokenCookie(): void {
  document.cookie = `${TOKEN_COOKIE_NAME}=; max-age=0; path=/; SameSite=Strict`;
}

/**
 * Clear the user role from cookies
 */
export function clearRoleCookie(): void {
  document.cookie = `${ROLE_COOKIE_NAME}=; max-age=0; path=/; SameSite=Strict`;
}

/**
 * Clear all authentication cookies
 */
export function clearAuthCookies(): void {
  clearTokenCookie();
  clearRoleCookie();
}

/**
 * Check if token is expired by parsing JWT payload
 * JWT format: header.payload.signature
 */
export function isTokenExpired(token?: string): boolean {
  const tokenToParse = token || getTokenFromCookie();
  if (!tokenToParse) {
    console.warn("[Token] No token to check expiration");
    return true;
  }

  try {
    // JWT format: header.payload.signature
    const parts = tokenToParse.split(".");
    if (parts.length !== 3) {
      console.warn("[Token] Invalid JWT format");
      return true;
    }

    // Decode payload (base64url)
    const payload = parts[1];
    // Add padding if needed
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const decoded = JSON.parse(atob(padded));

    // Check expiration (exp is in seconds)
    if (!decoded.exp) {
      console.warn("[Token] No expiration in token");
      return false; // Can't determine, assume valid
    }

    const expirationTime = decoded.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const isExpired = currentTime >= expirationTime;

    if (isExpired) {
      console.warn("[Token] Token has expired. Exp:", new Date(expirationTime), "Current:", new Date(currentTime));
    } else {
      const msUntilExpiration = expirationTime - currentTime;
      console.debug("[Token] Token valid for:", Math.round(msUntilExpiration / 1000), "seconds");
    }

    return isExpired;
  } catch (error) {
    console.error("[Token] Error checking expiration:", error);
    return true; // Assume expired on error
  }
}
