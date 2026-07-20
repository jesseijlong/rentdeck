import type { Express } from "express";
import type { Server } from 'node:http';
import { storage } from "./storage";
import { insertPropertySchema } from "@shared/schema";

export async function registerRoutes(
  _httpServer: Server,
  app: Express
): Promise<Server> {
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

  return _httpServer;
}
