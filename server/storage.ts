import { properties, maintenance } from '@shared/schema';
import type { Property, InsertProperty, Maintenance, InsertMaintenance } from '@shared/schema';
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

// Auto-create the properties table if missing (simple migrations).
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    state TEXT NOT NULL DEFAULT '',
    zip TEXT NOT NULL DEFAULT '',
    "propertyType" TEXT NOT NULL DEFAULT 'Single Family',
    purchaseDate TEXT NOT NULL DEFAULT '',
    purchasePrice REAL NOT NULL DEFAULT 0,
    currentValue REAL NOT NULL DEFAULT 0,
    downPayment REAL NOT NULL DEFAULT 0,
    loanAmount REAL NOT NULL DEFAULT 0,
    loanBalance REAL NOT NULL DEFAULT 0,
    interestRate REAL NOT NULL DEFAULT 0,
    mortgagePayment REAL NOT NULL DEFAULT 0,
    monthlyRent REAL NOT NULL DEFAULT 0,
    otherIncome REAL NOT NULL DEFAULT 0,
    vacancyRate REAL NOT NULL DEFAULT 5,
    propertyTaxes REAL NOT NULL DEFAULT 0,
    insurance REAL NOT NULL DEFAULT 0,
    maintenance REAL NOT NULL DEFAULT 0,
    hoa REAL NOT NULL DEFAULT 0,
    propertyManagement REAL NOT NULL DEFAULT 0,
    utilities REAL NOT NULL DEFAULT 0,
    capexReserve REAL NOT NULL DEFAULT 0,
    otherExpenses REAL NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    createdAt INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS maintenance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    propertyId INTEGER NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    status TEXT NOT NULL DEFAULT 'Open',
    priority TEXT NOT NULL DEFAULT 'Medium',
    requestDate TEXT NOT NULL DEFAULT '',
    dueDate TEXT NOT NULL DEFAULT '',
    completedDate TEXT NOT NULL DEFAULT '',
    cost REAL NOT NULL DEFAULT 0,
    vendor TEXT NOT NULL DEFAULT '',
    invoiceRef TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    createdAt INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE CASCADE
  );
`);

export const db = drizzle(sqlite);

export interface IStorage {
  listProperties(): Promise<Property[]>;
  getProperty(id: number): Promise<Property | undefined>;
  createProperty(p: InsertProperty): Promise<Property>;
  updateProperty(id: number, p: InsertProperty): Promise<Property | undefined>;
  deleteProperty(id: number): Promise<void>;
  replaceAll(items: InsertProperty[]): Promise<void>;

  listMaintenance(): Promise<Maintenance[]>;
  createMaintenance(m: InsertMaintenance): Promise<Maintenance>;
  updateMaintenance(id: number, m: InsertMaintenance): Promise<Maintenance | undefined>;
  deleteMaintenance(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async listProperties(): Promise<Property[]> {
    return db.select().from(properties).all();
  }

  async getProperty(id: number): Promise<Property | undefined> {
    return db.select().from(properties).where(eq(properties.id, id)).get();
  }

  async createProperty(p: InsertProperty): Promise<Property> {
    const payload = { ...p, createdAt: Date.now() };
    return db.insert(properties).values(payload).returning().get();
  }

  async updateProperty(id: number, p: InsertProperty): Promise<Property | undefined> {
    db.update(properties).set(p).where(eq(properties.id, id)).run();
    return this.getProperty(id);
  }

  async deleteProperty(id: number): Promise<void> {
    db.delete(properties).where(eq(properties.id, id)).run();
  }

  async replaceAll(items: InsertProperty[]): Promise<void> {
    db.delete(properties).run();
    // also clear maintenance since properties are gone
    db.delete(maintenance).run();
    if (items.length === 0) return;
    const rows = items.map((p) => ({ ...p, createdAt: Date.now() }));
    db.insert(properties).values(rows).run();
  }

  async listMaintenance(): Promise<Maintenance[]> {
    return db.select().from(maintenance).all();
  }

  async createMaintenance(m: InsertMaintenance): Promise<Maintenance> {
    const payload = { ...m, createdAt: Date.now() };
    return db.insert(maintenance).values(payload).returning().get();
  }

  async updateMaintenance(id: number, m: InsertMaintenance): Promise<Maintenance | undefined> {
    db.update(maintenance).set(m).where(eq(maintenance.id, id)).run();
    return db.select().from(maintenance).where(eq(maintenance.id, id)).get();
  }

  async deleteMaintenance(id: number): Promise<void> {
    db.delete(maintenance).where(eq(maintenance.id, id)).run();
  }
}

export const storage = new DatabaseStorage();
