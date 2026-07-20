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
