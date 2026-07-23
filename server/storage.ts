import { properties, maintenance, checklists } from '@shared/schema';
import type { Property, InsertProperty, Maintenance, InsertMaintenance, Checklist, InsertChecklist } from '@shared/schema';
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";

const DB_PATH = process.env.DATABASE_PATH || "data.db";
const sqlite = new Database(DB_PATH);
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
    status TEXT NOT NULL DEFAULT 'Occupied',
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
    tenantName TEXT NOT NULL DEFAULT '',
    tenantPhone TEXT NOT NULL DEFAULT '',
    tenantEmail TEXT NOT NULL DEFAULT '',
    leaseStart TEXT NOT NULL DEFAULT '',
    leaseEnd TEXT NOT NULL DEFAULT '',
    deposit REAL NOT NULL DEFAULT 0,
    tenantNotes TEXT NOT NULL DEFAULT '',
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
    estimatedPartsCost REAL NOT NULL DEFAULT 0,
    estimatedLaborCost REAL NOT NULL DEFAULT 0,
    actualPartsCost REAL NOT NULL DEFAULT 0,
    actualLaborCost REAL NOT NULL DEFAULT 0,
    vendor TEXT NOT NULL DEFAULT '',
    invoiceRef TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    createdAt INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS checklists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    propertyId INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    visitDate TEXT NOT NULL DEFAULT '',
    items TEXT NOT NULL DEFAULT '[]',
    notes TEXT NOT NULL DEFAULT '',
    createdAt INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE CASCADE
  );
`);

// Add the status column to existing properties tables created before it existed.
try {
  sqlite.exec(`ALTER TABLE properties ADD COLUMN status TEXT NOT NULL DEFAULT 'Occupied';`);
} catch {
  // Column already exists — ignore.
}

// Add tenant columns to existing properties tables created before they existed.
for (const col of [
  `ALTER TABLE properties ADD COLUMN tenantName TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE properties ADD COLUMN tenantPhone TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE properties ADD COLUMN tenantEmail TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE properties ADD COLUMN leaseStart TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE properties ADD COLUMN leaseEnd TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE properties ADD COLUMN deposit REAL NOT NULL DEFAULT 0;`,
  `ALTER TABLE properties ADD COLUMN tenantNotes TEXT NOT NULL DEFAULT '';`,
]) {
  try {
    sqlite.exec(col);
  } catch {
    // Column already exists — ignore.
  }
}

// Add estimate/cost breakdown columns to existing maintenance tables created before they existed.
for (const col of [
  `ALTER TABLE maintenance ADD COLUMN estimatedPartsCost REAL NOT NULL DEFAULT 0;`,
  `ALTER TABLE maintenance ADD COLUMN estimatedLaborCost REAL NOT NULL DEFAULT 0;`,
  `ALTER TABLE maintenance ADD COLUMN actualPartsCost REAL NOT NULL DEFAULT 0;`,
  `ALTER TABLE maintenance ADD COLUMN actualLaborCost REAL NOT NULL DEFAULT 0;`,
]) {
  try {
    sqlite.exec(col);
  } catch {
    // Column already exists — ignore.
  }
}

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

  listChecklists(): Promise<Checklist[]>;
  listChecklistsForProperty(propertyId: number): Promise<Checklist[]>;
  getChecklist(id: number): Promise<Checklist | undefined>;
  createChecklist(c: InsertChecklist): Promise<Checklist>;
  updateChecklist(id: number, c: InsertChecklist): Promise<Checklist | undefined>;
  deleteChecklist(id: number): Promise<void>;
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
    // also clear maintenance + checklists since properties are gone
    db.delete(maintenance).run();
    db.delete(checklists).run();
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

  async listChecklists(): Promise<Checklist[]> {
    return db.select().from(checklists).all();
  }

  async listChecklistsForProperty(propertyId: number): Promise<Checklist[]> {
    return db.select().from(checklists).where(eq(checklists.propertyId, propertyId)).all();
  }

  async getChecklist(id: number): Promise<Checklist | undefined> {
    return db.select().from(checklists).where(eq(checklists.id, id)).get();
  }

  async createChecklist(c: InsertChecklist): Promise<Checklist> {
    const payload = { ...c, createdAt: Date.now() };
    return db.insert(checklists).values(payload).returning().get();
  }

  async updateChecklist(id: number, c: InsertChecklist): Promise<Checklist | undefined> {
    db.update(checklists).set(c).where(eq(checklists.id, id)).run();
    return this.getChecklist(id);
  }

  async deleteChecklist(id: number): Promise<void> {
    db.delete(checklists).where(eq(checklists.id, id)).run();
  }
}

export const storage = new DatabaseStorage();
