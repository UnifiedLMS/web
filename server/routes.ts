import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import fetch from "node-fetch"; 
import FormData from "form-data";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Proxy Login Request
  app.post(api.auth.login.path, async (req, res) => {
    try {
      const { username, password } = api.auth.login.input.parse(req.body);

      // Construct form data as expected by the C# Unity backend
      // form.AddField("grant_type", "password");
      // form.AddField("username", username);
      // form.AddField("password", password);
      // form.AddField("scope", ""); ...
      
      const formData = new URLSearchParams();
      formData.append('grant_type', 'password');
      formData.append('username', username);
      formData.append('password', password);
      formData.append('scope', '');
      formData.append('client_id', '');
      formData.append('client_secret', '');

      const response = await fetch("https://unifyapi.onrender.com/api/v1/auth/login", {
        method: "POST",
        body: formData,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Login Proxy Error:", response.status, errorText);
        return res.status(401).json({ message: "Неправильні дані або помилка сервера" });
      }

      const data = await response.json();
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

      // C# sends an empty form for token check
      const response = await fetch("https://unifyapi.onrender.com/api/v1/auth/token", {
        method: "POST",
        body: "", // Empty body
        headers: {
          "access-token": token,
          "token-type": "bearer"
        }
      });

      if (!response.ok) {
         return res.status(401).json({ message: "Token invalid" });
      }

      const data = await response.json();
      res.json(data);

    } catch (err) {
       console.error("Token Check Error:", err);
       res.status(500).json({ message: "Internal Server Error" });
    }
  });

  return httpServer;
}
