import type { Express } from "express";
import type { Server } from 'node:http';
import { storage } from "./storage";
import { insertPropertySchema, insertMaintenanceSchema, insertChecklistSchema } from "@shared/schema";
import { isAuthEnabled, isAuthenticated, checkPassword, createSession, AUTH_COOKIE, AUTH_MAX_AGE } from "./auth";

export async function registerRoutes(
  _httpServer: Server,
  app: Express
): Promise<Server> {
  // ---- Auth ----
  app.get("/api/auth/me", (req, res) => {
    if (!isAuthEnabled()) return res.json({ authenticated: true, authEnabled: false });
    res.json({ authenticated: isAuthenticated(req), authEnabled: true });
  });

  app.post("/api/auth/login", (req, res) => {
    const { password } = (req.body || {}) as { password?: string };
    if (!isAuthEnabled()) return res.status(400).json({ error: "Auth not configured" });
    if (!checkPassword(password || "")) return res.status(401).json({ error: "Incorrect password" });
    res.cookie(AUTH_COOKIE, createSession(), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: AUTH_MAX_AGE * 1000,
    });
    res.json({ authenticated: true });
  });

  app.post("/api/auth/logout", (_req, res) => {
    res.clearCookie(AUTH_COOKIE, { path: "/" });
    res.json({ authenticated: false });
  });

  // Protect all other /api routes when auth is enabled.
  app.use("/api", (req, res, next) => {
    if (!isAuthEnabled()) return next();
    if (req.path.startsWith("/auth/")) return next();
    if (isAuthenticated(req)) return next();
    return res.status(401).json({ error: "Not authenticated" });
  });
  app.get("/api/properties", async (_req, res) => {
    const items = await storage.listProperties();
    res.json(items);
  });

  app.post("/api/properties", async (req, res) => {
    const parsed = insertPropertySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const created = await storage.createProperty(parsed.data);
    res.status(201).json(created);
  });

  app.put("/api/properties/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    const parsed = insertPropertySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const updated = await storage.updateProperty(id, parsed.data);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  app.delete("/api/properties/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    await storage.deleteProperty(id);
    res.status(204).end();
  });

  app.post("/api/properties/replace", async (req, res) => {
    const items = Array.isArray(req.body) ? req.body : [];
    const cleaned = items.map((it: Record<string, unknown>) =>
      insertPropertySchema.parse(it)
    );
    await storage.replaceAll(cleaned);
    res.json({ count: cleaned.length });
  });

  // ---- Maintenance ----
  app.get("/api/maintenance", async (_req, res) => {
    const items = await storage.listMaintenance();
    res.json(items);
  });

  app.post("/api/maintenance", async (req, res) => {
    const parsed = insertMaintenanceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const created = await storage.createMaintenance(parsed.data);
    res.status(201).json(created);
  });

  app.put("/api/maintenance/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    const parsed = insertMaintenanceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const updated = await storage.updateMaintenance(id, parsed.data);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  app.delete("/api/maintenance/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    await storage.deleteMaintenance(id);
    res.status(204).end();
  });

  // ---- Checklists ----
  app.get("/api/checklists", async (_req, res) => {
    const items = await storage.listChecklists();
    res.json(items);
  });

  app.get("/api/properties/:id/checklists", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    const items = await storage.listChecklistsForProperty(id);
    res.json(items);
  });

  app.get("/api/checklists/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    const item = await storage.getChecklist(id);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  });

  app.post("/api/checklists", async (req, res) => {
    const parsed = insertChecklistSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const created = await storage.createChecklist(parsed.data);
    res.status(201).json(created);
  });

  app.put("/api/checklists/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    const parsed = insertChecklistSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const updated = await storage.updateChecklist(id, parsed.data);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  app.delete("/api/checklists/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    await storage.deleteChecklist(id);
    res.status(204).end();
  });

  return _httpServer;
}
