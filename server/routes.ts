import type { Express } from "express";
import type { Server } from "http";
import { api } from "@shared/routes";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const EXTERNAL_API = "https://unifyapi.onrender.com";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Proxy Login Request
  app.post(api.auth.login.path, async (req, res) => {
    try {
      const { username, password } = api.auth.login.input.parse(req.body);

      // Using curl for proxying as requested
      const curlCommand = `curl -X POST https://unifyapi.onrender.com/api/v1/auth/login \
        -d "grant_type=password" \
        -d "username=${username}" \
        -d "password=${password}" \
        -d "scope=" \
        -d "client_id=" \
        -d "client_secret=" \
        -H "Content-Type: application/x-www-form-urlencoded"`;

      const { stdout, stderr } = await execAsync(curlCommand);
      
      if (stderr && !stdout) {
        console.error("CURL Login Error:", stderr);
        return res.status(401).json({ message: "Неправильні дані або помилка сервера" });
      }

      const data = JSON.parse(stdout);
      
      console.log(`[Auth] Login successful for ${username} with role: ${data.role}`);
      res.json(data);

    } catch (err) {
      console.error("Login Error:", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Google OAuth Login Redirect
  app.get(api.auth.loginGoogle.path, (req, res) => {
    const origin = `${req.protocol}://${req.get("host")}`;
    const callbackUrl = `${origin}/login`;
    const redirectUrl = new URL(`${EXTERNAL_API}/api/v1/auth/google`);
    redirectUrl.searchParams.set("redirect_uri", callbackUrl);
    redirectUrl.searchParams.set("redirect_url", callbackUrl);
    redirectUrl.searchParams.set("redirect", callbackUrl);
    redirectUrl.searchParams.set("return_to", callbackUrl);
    redirectUrl.searchParams.set("return_url", callbackUrl);
    redirectUrl.searchParams.set("callback", callbackUrl);
    redirectUrl.searchParams.set("success_redirect", callbackUrl);
    redirectUrl.searchParams.set("failure_redirect", `${callbackUrl}?oauth_error=1`);
    console.log(`[Auth] Redirecting to Google OAuth: ${redirectUrl.toString()}`);
    res.redirect(redirectUrl.toString());
  });

  // Google OAuth Callback -> Exchange code, then redirect to login with token
  app.get("/api/proxy/api/v1/auth/google/callback", async (req, res) => {
    try {
      const origin = `${req.protocol}://${req.get("host")}`;
      const queryString = req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : "";
      const url = `${EXTERNAL_API}/api/v1/auth/google${queryString}`;
      console.log(`[Auth] Exchanging Google code: ${url}`);

      const response = await fetch(url);
      const text = await response.text();

      if (!response.ok) {
        console.error("[Auth] Google exchange failed:", text);
        return res.status(response.status).send(text);
      }

      let data: any;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error("[Auth] Failed to parse Google exchange response:", parseError);
        return res.status(500).send(text);
      }

      const token = data?.access_token || data?.token;
      if (!token) {
        console.error("[Auth] Missing access token in response:", data);
        return res.status(500).json({ message: "Token missing in Google response" });
      }

      // Extract role if available (various possible field names)
      const role = data?.role || data?.user_role || data?.userRole;
      
      // Build redirect URL with token and optionally role
      let redirectTo = `${origin}/login?access_token=${encodeURIComponent(token)}`;
      if (role) {
        redirectTo += `&role=${encodeURIComponent(role)}`;
      }
      
      console.log(`[Auth] Redirecting to app login: ${redirectTo} (role: ${role || 'not provided'})`);
      res.redirect(redirectTo);
    } catch (err: any) {
      console.error("[Auth] Google callback error:", err);
      res.status(500).json({ message: err.message || "Internal Server Error" });
    }
  });

  // Google OAuth Code Exchange (used by finish page)
  app.get("/api/proxy/api/v1/auth/google/exchange", async (req, res) => {
    try {
      const code = typeof req.query.code === "string" ? req.query.code : "";
      const state = typeof req.query.state === "string" ? req.query.state : "";

      if (!code) {
        return res.status(400).json({ message: "Missing code" });
      }

      const url = new URL(`${EXTERNAL_API}/api/v1/auth/google`);
      url.searchParams.set("code", code);
      if (state) {
        url.searchParams.set("state", state);
      }

      console.log(`[Auth] Exchanging Google code via API: ${url.toString()}`);
      const response = await fetch(url.toString());
      const text = await response.text();

      res.status(response.status);
      try {
        const json = JSON.parse(text);
        res.json(json);
      } catch {
        res.send(text);
      }
    } catch (err: any) {
      console.error("[Auth] Google exchange error:", err);
      res.status(500).json({ message: err.message || "Internal Server Error" });
    }
  });

  // Proxy Token Check
  app.post(api.auth.checkToken.path, async (req, res) => {
    try {
      const { token } = api.auth.checkToken.input.parse(req.body);

      // Using curl for token check proxying (-s for silent mode)
      const curlCommand = `curl -s -X POST https://unifyapi.onrender.com/api/v1/auth/token \
        -H "access-token: ${token}" \
        -H "token-type: bearer"`;

      console.log("[Auth] Checking token...");
      const { stdout, stderr } = await execAsync(curlCommand);
      console.log("[Auth] Token check stdout:", stdout);
      if (stderr) console.log("[Auth] Token check stderr:", stderr);

      if (stderr && !stdout) {
         return res.status(401).json({ message: "Token invalid" });
      }

      const data = JSON.parse(stdout);
      console.log("[Auth] Token check data:", data);

      res.json(data);

    } catch (err) {
       console.error("Token Check Error:", err);
       res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Generic proxy for all other API requests - must be after specific routes
  // Use a regex pattern to match all /api/proxy routes except auth routes
  app.all(/^\/api\/proxy\/.+/, async (req, res, next) => {
    // Skip specific auth routes - they should have been handled above, but check anyway
    if (
      req.path.startsWith("/api/proxy/auth/login") ||
      req.path.startsWith("/api/proxy/auth/token") ||
      req.path.startsWith("/api/proxy/api/v1/auth/google")
    ) {
      return next();
    }
    
    try {
      // Extract path after /api/proxy
      // req.path will be like "/api/proxy/api/v1/groups/all" or "/api/proxy/v1/groups/all"
      // We want to remove "/api/proxy" to get "/api/v1/groups/all" or "/v1/groups/all"
      let proxyPath = req.path.replace("/api/proxy", "");
      // If path starts with /api/, keep it, otherwise we might need to adjust
      if (!proxyPath.startsWith("/")) {
        proxyPath = "/" + proxyPath;
      }
      
      const queryString = req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : "";
      const url = `${EXTERNAL_API}${proxyPath}${queryString}`;
      
      console.log(`[Proxy] ${req.method} ${req.path} -> ${url}`);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Forward authorization header - Express lowercases header names, so check both
      const authHeader = req.headers.authorization || req.headers["authorization"] || req.headers["access-token"];
      if (authHeader) {
        // Extract token from "Bearer <token>" format
        let token = typeof authHeader === "string" ? authHeader : String(authHeader);
        if (token.startsWith("Bearer ")) {
          token = token.substring(7);
        }
        
        // The external API uses access-token and token-type headers instead of Authorization
        headers["access-token"] = token;
        headers["token-type"] = "bearer";
        // Also send standard Authorization header for compatibility
        headers["Authorization"] = `Bearer ${token}`;
        console.log(`[Proxy] Forwarding auth headers for ${url}`);
      } else {
        console.warn(`[Proxy] No Authorization header found in request`);
        // Log available headers for debugging
        console.log(`[Proxy] Available headers:`, Object.keys(req.headers));
      }

      const fetchOptions: any = {
        method: req.method,
        headers,
      };

      // Include body for POST, PUT, PATCH
      if (req.method !== "GET" && req.method !== "DELETE") {
        let bodyString: string = "";
        
        // Always prefer rawBody to avoid double-stringification
        if (req.rawBody) {
          // Use the raw body as-is to preserve exact content
          bodyString = Buffer.isBuffer(req.rawBody) 
            ? req.rawBody.toString("utf-8")
            : String(req.rawBody);
          console.log(`[Proxy] Using rawBody:`, bodyString.substring(0, 200));
        } else if (req.body !== undefined && req.body !== null) {
          // Fallback: only stringify if body is not already a string
          if (typeof req.body === "string") {
            bodyString = req.body;
            console.log(`[Proxy] Using req.body as string:`, bodyString.substring(0, 200));
          } else {
            bodyString = JSON.stringify(req.body);
            console.log(`[Proxy] Using JSON.stringify(req.body):`, bodyString.substring(0, 200));
          }
        }
        
        if (bodyString) {
          fetchOptions.body = bodyString;
        }
      }

      const response = await fetch(url, fetchOptions);
      const text = await response.text();
      
      // Forward status and headers
      res.status(response.status);
      
      // Try to parse and forward JSON
      try {
        const json = JSON.parse(text);
        res.json(json);
      } catch {
        res.send(text);
      }
    } catch (err: any) {
      console.error("[Proxy] Error:", err);
      res.status(500).json({ message: err.message || "Proxy Error" });
    }
  });

  return httpServer;
}
