import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const properties = sqliteTable("properties", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  address: text("address").notNull().default(""),
  city: text("city").notNull().default(""),
  state: text("state").notNull().default(""),
  zip: text("zip").notNull().default(""),
  propertyType: text("propertyType").notNull().default("Single Family"),
  status: text("status").notNull().default("Occupied"),

  purchaseDate: text("purchaseDate").notNull().default(""),
  purchasePrice: real("purchasePrice").notNull().default(0),
  currentValue: real("currentValue").notNull().default(0),

  downPayment: real("downPayment").notNull().default(0),
  loanAmount: real("loanAmount").notNull().default(0),
  loanBalance: real("loanBalance").notNull().default(0),
  interestRate: real("interestRate").notNull().default(0),
  mortgagePayment: real("mortgagePayment").notNull().default(0),

  monthlyRent: real("monthlyRent").notNull().default(0),
  otherIncome: real("otherIncome").notNull().default(0),
  vacancyRate: real("vacancyRate").notNull().default(5),

  propertyTaxes: real("propertyTaxes").notNull().default(0),
  insurance: real("insurance").notNull().default(0),
  maintenance: real("maintenance").notNull().default(0),
  hoa: real("hoa").notNull().default(0),
  propertyManagement: real("propertyManagement").notNull().default(0),
  utilities: real("utilities").notNull().default(0),
  capexReserve: real("capexReserve").notNull().default(0),
  otherExpenses: real("otherExpenses").notNull().default(0),

  tenantName: text("tenantName").notNull().default(""),
  tenantPhone: text("tenantPhone").notNull().default(""),
  tenantEmail: text("tenantEmail").notNull().default(""),
  leaseStart: text("leaseStart").notNull().default(""),
  leaseEnd: text("leaseEnd").notNull().default(""),
  deposit: real("deposit").notNull().default(0),
  tenantNotes: text("tenantNotes").notNull().default(""),

  notes: text("notes").notNull().default(""),
  createdAt: integer("createdAt").notNull().default(0),
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
});

export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;

export const PROPERTY_TYPES = [
  "Single Family",
  "Multi-Family",
  "Duplex",
  "Triplex",
  "Fourplex",
  "Condo",
  "Townhouse",
  "Apartment",
  "Commercial",
  "Land",
  "Other",
] as const;

export const PROPERTY_STATUSES = ["Occupied", "Vacant", "Turnover"] as const;

export const maintenance = sqliteTable("maintenance", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  propertyId: integer("propertyId").notNull(),
  title: text("title").notNull(),
  category: text("category").notNull().default("General"),
  status: text("status").notNull().default("Open"),
  priority: text("priority").notNull().default("Medium"),
  requestDate: text("requestDate").notNull().default(""),
  dueDate: text("dueDate").notNull().default(""),
  completedDate: text("completedDate").notNull().default(""),
  cost: real("cost").notNull().default(0),
  estimatedPartsCost: real("estimatedPartsCost").notNull().default(0),
  estimatedLaborCost: real("estimatedLaborCost").notNull().default(0),
  actualPartsCost: real("actualPartsCost").notNull().default(0),
  actualLaborCost: real("actualLaborCost").notNull().default(0),
  vendor: text("vendor").notNull().default(""),
  invoiceRef: text("invoiceRef").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: integer("createdAt").notNull().default(0),
});

export const insertMaintenanceSchema = createInsertSchema(maintenance).omit({
  id: true,
  createdAt: true,
});

export type InsertMaintenance = z.infer<typeof insertMaintenanceSchema>;
export type Maintenance = typeof maintenance.$inferSelect;

export const MAINTENANCE_CATEGORIES = [
  "General",
  "Plumbing",
  "HVAC",
  "Electrical",
  "Roofing",
  "Appliance",
  "Pest Control",
  "Landscaping",
  "Cosmetic",
  "Other",
] as const;

export const MAINTENANCE_STATUSES = ["Open", "In Progress", "Completed", "Cancelled"] as const;
export const MAINTENANCE_PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;

export const checklists = sqliteTable("checklists", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  propertyId: integer("propertyId").notNull(),
  type: text("type").notNull(), // 'new-tenant' | 'monthly-visit'
  title: text("title").notNull().default(""),
  visitDate: text("visitDate").notNull().default(""),
  items: text("items").notNull().default("[]"), // JSON array of { label, checked }
  notes: text("notes").notNull().default(""),
  createdAt: integer("createdAt").notNull().default(0),
});

export const insertChecklistSchema = createInsertSchema(checklists).omit({
  id: true,
  createdAt: true,
});

export type InsertChecklist = z.infer<typeof insertChecklistSchema>;
export type Checklist = typeof checklists.$inferSelect;

export const CHECKLIST_TYPES = ["new-tenant", "monthly-visit"] as const;
