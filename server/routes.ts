import type { Express } from "express";
import type { Server } from "http";
import { api } from "@shared/routes";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

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
      
      // Role-based access control (admins only)
      if (data.role !== "admins") {
        console.warn(`Access denied for user ${username}: Role is ${data.role}`);
        return res.status(403).json({ message: "У вас немає прав адміністратора для входу в цей інтерфейс" });
      }

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
      
      // Role-based access control (admins only)
      if (data.role !== "admins") {
        return res.status(403).json({ message: "Недостатньо прав" });
      }

      res.json(data);

    } catch (err) {
       console.error("Token Check Error:", err);
       res.status(500).json({ message: "Internal Server Error" });
    }
  });

  return httpServer;
}
