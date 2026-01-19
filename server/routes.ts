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
      
      // Allow students, teachers, and admins to login
      const allowedRoles = ["students", "teachers", "admins"];
      if (!allowedRoles.includes(data.role)) {
        console.warn(`Access denied for user ${username}: Role is ${data.role}`);
        return res.status(403).json({ message: "Невідома роль користувача" });
      }
      
      console.log(`[Auth] Login successful for ${username} with role: ${data.role}`);
      res.json(data);

    } catch (err) {
      console.error("Login Error:", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Proxy Token Check
  app.post(api.auth.checkToken.path, async (req, res) => {
    try {
      const { token } = api.auth.checkToken.input.parse(req.body);

      // Using curl for token check proxying
      const curlCommand = `curl -X POST https://unifyapi.onrender.com/api/v1/auth/token \
        -H "access-token: ${token}" \
        -H "token-type: bearer"`;

      const { stdout, stderr } = await execAsync(curlCommand);

      if (stderr && !stdout) {
         return res.status(401).json({ message: "Token invalid" });
      }

      const data = JSON.parse(stdout);
      
      // Allow students, teachers, and admins
      const allowedRoles = ["students", "teachers", "admins"];
      if (!allowedRoles.includes(data.role)) {
        return res.status(403).json({ message: "Недостатньо прав" });
      }

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
    if (req.path.startsWith("/api/proxy/auth/login") || req.path.startsWith("/api/proxy/auth/token")) {
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
