import type { Property } from "@shared/schema";

const COLUMNS: { key: keyof Property; header: string }[] = [
  { key: "name", header: "Name" },
  { key: "address", header: "Address" },
  { key: "city", header: "City" },
  { key: "state", header: "State" },
  { key: "zip", header: "ZIP" },
  { key: "propertyType", header: "Property Type" },
  { key: "status", header: "Status" },
  { key: "purchaseDate", header: "Purchase Date" },
  { key: "purchasePrice", header: "Purchase Price" },
  { key: "currentValue", header: "Current Value" },
  { key: "monthlyRent", header: "Monthly Rent" },
  { key: "otherIncome", header: "Other Income" },
  { key: "vacancyRate", header: "Vacancy Rate %" },
  { key: "propertyTaxes", header: "Property Taxes" },
  { key: "insurance", header: "Insurance" },
  { key: "maintenance", header: "Maintenance" },
  { key: "hoa", header: "HOA" },
  { key: "propertyManagement", header: "Property Management" },
  { key: "utilities", header: "Utilities" },
  { key: "capexReserve", header: "CapEx Reserve" },
  { key: "otherExpenses", header: "Other Expenses" },
  { key: "tenantName", header: "Tenant Name" },
  { key: "tenantPhone", header: "Tenant Phone" },
  { key: "tenantEmail", header: "Tenant Email" },
  { key: "leaseStart", header: "Lease Start" },
  { key: "leaseEnd", header: "Lease End" },
  { key: "deposit", header: "Security Deposit" },
  { key: "tenantNotes", header: "Tenant Notes" },
  { key: "notes", header: "Notes" },
];

function esc(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function propertiesToCsv(items: Property[]): string {
  const header = COLUMNS.map((c) => c.header).join(",");
  const rows = items.map((it) =>
    COLUMNS.map((c) => esc(it[c.key])).join(",")
  );
  return [header, ...rows].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Minimal CSV row parser (handles quoted fields, embedded commas/newlines/quotes)
function parseCsvLine(line: string, rest: string[]): { values: string[]; remaining: string } | null {
  const values: string[] = [];
  let i = 0;
  while (i <= line.length) {
    let val = "";
    if (line[i] === '"') {
      i++;
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            val += '"';
            i += 2;
          } else {
            i++;
            break;
          }
        } else {
          val += line[i];
          i++;
        }
      }
      // field may continue across newline if quote was open — handled by outer loop
    } else {
      while (i < line.length && line[i] !== ",") {
        val += line[i];
        i++;
      }
    }
    values.push(val);
    if (line[i] === ",") {
      i++;
      continue;
    }
    // end of line
    if (i >= line.length) {
      return { values, remaining: rest.join("\n") };
    }
    // newline inside quoted field
    if (rest.length > 0) {
      line = line.slice(0, i) + "\n" + rest.shift();
      continue;
    }
    return { values, remaining: "" };
  }
  return null;
}

export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const rows: string[][] = [];
  let buffer = lines.shift() ?? "";
  let rest = lines;
  while (buffer !== "" || rest.length > 0) {
    const res = parseCsvLine(buffer, rest);
    if (!res) break;
    rows.push(res.values);
    buffer = res.remaining === "" && rest.length === 0 ? "" : res.remaining.split("\n").shift() ?? "";
    rest = res.remaining.split("\n").slice(1);
    if (res.remaining === "" && rest.length === 0) break;
  }
  if (rows.length === 0) return [];
  const header = rows[0];
  return rows.slice(1).filter((r) => r.some((c) => c.trim() !== "")).map((r) => {
    const obj: Record<string, string> = {};
    header.forEach((h, idx) => {
      obj[h.trim()] = (r[idx] ?? "").trim();
    });
    return obj;
  });
}

const HEADER_TO_KEY: Record<string, keyof Property> = Object.fromEntries(
  COLUMNS.map((c) => [c.header.toLowerCase(), c.key])
);

export function rowsToProperties(rows: Record<string, string>[]): Omit<Property, "id" | "createdAt">[] {
  return rows.map((r) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r)) {
      const key = HEADER_TO_KEY[k.toLowerCase()];
      if (!key) continue;
      const numericKeys: (keyof Property)[] = [
        "purchasePrice", "currentValue",
        "monthlyRent", "otherIncome", "vacancyRate",
        "propertyTaxes", "insurance", "maintenance", "hoa", "propertyManagement",
        "utilities", "capexReserve", "otherExpenses", "deposit",
      ];
      if (numericKeys.includes(key)) {
        out[key] = v === "" ? 0 : Number(v);
      } else {
        out[key] = v;
      }
    }
    // ensure defaults
    const base: Omit<Property, "id" | "createdAt"> = {
      name: (out.name as string) || "Untitled",
      address: (out.address as string) || "",
      city: (out.city as string) || "",
      state: (out.state as string) || "",
      zip: (out.zip as string) || "",
      propertyType: (out.propertyType as string) || "Single Family",
      status: (out.status as string) || "Occupied",
      purchaseDate: (out.purchaseDate as string) || "",
      purchasePrice: Number(out.purchasePrice) || 0,
      currentValue: Number(out.currentValue) || 0,
      downPayment: Number(out.downPayment) || 0,
      loanAmount: Number(out.loanAmount) || 0,
      loanBalance: Number(out.loanBalance) || 0,
      interestRate: Number(out.interestRate) || 0,
      mortgagePayment: Number(out.mortgagePayment) || 0,
      monthlyRent: Number(out.monthlyRent) || 0,
      otherIncome: Number(out.otherIncome) || 0,
      vacancyRate: Number(out.vacancyRate) || 0,
      propertyTaxes: Number(out.propertyTaxes) || 0,
      insurance: Number(out.insurance) || 0,
      maintenance: Number(out.maintenance) || 0,
      hoa: Number(out.hoa) || 0,
      propertyManagement: Number(out.propertyManagement) || 0,
      utilities: Number(out.utilities) || 0,
      capexReserve: Number(out.capexReserve) || 0,
      otherExpenses: Number(out.otherExpenses) || 0,
      tenantName: (out.tenantName as string) || "",
      tenantPhone: (out.tenantPhone as string) || "",
      tenantEmail: (out.tenantEmail as string) || "",
      leaseStart: (out.leaseStart as string) || "",
      leaseEnd: (out.leaseEnd as string) || "",
      deposit: Number(out.deposit) || 0,
      tenantNotes: (out.tenantNotes as string) || "",
      notes: (out.notes as string) || "",
    };
    return base;
  });
}
