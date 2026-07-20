import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROPERTY_TYPES, type InsertProperty, type Property } from "@shared/schema";
import { computeMetrics } from "@/lib/metrics";
import { currency, percent } from "@/lib/format";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (data: InsertProperty) => Promise<void>;
  editing?: Property | null;
};

const NUM_FIELDS: { key: keyof InsertProperty; label: string; hint?: string }[] = [
  { key: "purchasePrice", label: "Purchase price" },
  { key: "currentValue", label: "Current value" },
  { key: "downPayment", label: "Down payment" },
  { key: "loanAmount", label: "Original loan amount" },
  { key: "loanBalance", label: "Current loan balance" },
  { key: "interestRate", label: "Interest rate", hint: "%" },
  { key: "mortgagePayment", label: "Mortgage payment (P&I)", hint: "monthly" },
  { key: "monthlyRent", label: "Monthly rent" },
  { key: "otherIncome", label: "Other income", hint: "monthly" },
  { key: "vacancyRate", label: "Vacancy rate", hint: "%" },
  { key: "propertyTaxes", label: "Property taxes", hint: "monthly" },
  { key: "insurance", label: "Insurance", hint: "monthly" },
  { key: "maintenance", label: "Maintenance", hint: "monthly" },
  { key: "hoa", label: "HOA", hint: "monthly" },
  { key: "propertyManagement", label: "Property mgmt", hint: "monthly" },
  { key: "utilities", label: "Utilities", hint: "monthly" },
  { key: "capexReserve", label: "CapEx reserve", hint: "monthly" },
  { key: "otherExpenses", label: "Other expenses", hint: "monthly" },
];

const EMPTY: InsertProperty = {
  name: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  propertyType: "Single Family",
  purchaseDate: "",
  purchasePrice: 0,
  currentValue: 0,
  downPayment: 0,
  loanAmount: 0,
  loanBalance: 0,
  interestRate: 0,
  mortgagePayment: 0,
  monthlyRent: 0,
  otherIncome: 0,
  vacancyRate: 5,
  propertyTaxes: 0,
  insurance: 0,
  maintenance: 0,
  hoa: 0,
  propertyManagement: 0,
  utilities: 0,
  capexReserve: 0,
  otherExpenses: 0,
  notes: "",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-foreground col-span-2 mt-2 mb-1">
      {children}
    </h3>
  );
}

export function PropertyForm({ open, onOpenChange, onSave, editing }: Props) {
  const [form, setForm] = useState<InsertProperty>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setErr(null);
      if (editing) {
        const { id: _id, createdAt: _c, ...rest } = editing;
        setForm(rest);
      } else {
        setForm(EMPTY);
      }
    }
  }, [open, editing]);

  const set = <K extends keyof InsertProperty>(k: K, v: InsertProperty[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const setNum = (k: keyof InsertProperty, v: string) =>
    set(k, (v === "" ? 0 : Number(v)) as never);

  const preview = computeMetrics({ ...form, id: 0, createdAt: 0 } as Property);

  const submit = async () => {
    setErr(null);
    if (!form.name.trim()) {
      setErr("Property name is required.");
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      onOpenChange(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save property.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit property" : "Add property"}</DialogTitle>
          <DialogDescription>
            Enter details below. Performance metrics update automatically as you type.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-2">
          <SectionTitle>Property basics</SectionTitle>
          <div className="col-span-2 grid grid-cols-2 gap-x-4 gap-y-3">
            <div className="col-span-2 sm:col-span-1 grid gap-1.5">
              <Label htmlFor="f-name">Name</Label>
              <Input
                id="f-name"
                data-testid="input-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Maple Street Duplex"
              />
            </div>
            <div className="col-span-2 sm:col-span-1 grid gap-1.5">
              <Label htmlFor="f-type">Type</Label>
              <Select
                value={form.propertyType}
                onValueChange={(v) => set("propertyType", v)}
              >
                <SelectTrigger id="f-type" data-testid="select-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 grid gap-1.5">
              <Label htmlFor="f-address">Street address</Label>
              <Input
                id="f-address"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="412 Maple St"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="f-city">City</Label>
              <Input
                id="f-city"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="f-state">State</Label>
                <Input
                  id="f-state"
                  value={form.state}
                  onChange={(e) => set("state", e.target.value)}
                  placeholder="NC"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="f-zip">ZIP</Label>
                <Input
                  id="f-zip"
                  value={form.zip}
                  onChange={(e) => set("zip", e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="f-date">Purchase date</Label>
              <Input
                id="f-date"
                type="date"
                value={form.purchaseDate}
                onChange={(e) => set("purchaseDate", e.target.value)}
              />
            </div>
          </div>

          <SectionTitle>Financing & value</SectionTitle>
          {NUM_FIELDS.slice(0, 7).map((f) => (
            <div key={f.key} className="grid gap-1.5">
              <Label htmlFor={`f-${f.key}`}>{f.label}</Label>
              <Input
                id={`f-${f.key}`}
                type="number"
                inputMode="decimal"
                value={form[f.key] === 0 ? "" : String(form[f.key])}
                onChange={(e) => setNum(f.key, e.target.value)}
                placeholder="0"
                data-testid={`input-${f.key}`}
              />
              {f.hint && (
                <span className="text-xs text-muted-foreground">{f.hint}</span>
              )}
            </div>
          ))}

          <SectionTitle>Income</SectionTitle>
          {NUM_FIELDS.slice(7, 10).map((f) => (
            <div key={f.key} className="grid gap-1.5">
              <Label htmlFor={`f-${f.key}`}>{f.label}</Label>
              <Input
                id={`f-${f.key}`}
                type="number"
                inputMode="decimal"
                value={form[f.key] === 0 ? "" : String(form[f.key])}
                onChange={(e) => setNum(f.key, e.target.value)}
                placeholder="0"
              />
              {f.hint && (
                <span className="text-xs text-muted-foreground">{f.hint}</span>
              )}
            </div>
          ))}

          <SectionTitle>Expenses (monthly)</SectionTitle>
          {NUM_FIELDS.slice(10).map((f) => (
            <div key={f.key} className="grid gap-1.5">
              <Label htmlFor={`f-${f.key}`}>{f.label}</Label>
              <Input
                id={`f-${f.key}`}
                type="number"
                inputMode="decimal"
                value={form[f.key] === 0 ? "" : String(form[f.key])}
                onChange={(e) => setNum(f.key, e.target.value)}
                placeholder="0"
              />
              {f.hint && (
                <span className="text-xs text-muted-foreground">{f.hint}</span>
              )}
            </div>
          ))}

          <div className="col-span-2 grid gap-1.5">
            <Label htmlFor="f-notes">Notes</Label>
            <Textarea
              id="f-notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              placeholder="Tenant details, recent repairs, reminders…"
            />
          </div>
        </div>

        {/* Live metrics preview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-lg border bg-muted/40 p-3">
          <Metric label="Monthly cash flow" value={currency(preview.monthlyCashFlow)} tone={preview.monthlyCashFlow >= 0 ? "pos" : "neg"} />
          <Metric label="Annual cash flow" value={currency(preview.annualCashFlow)} tone={preview.annualCashFlow >= 0 ? "pos" : "neg"} />
          <Metric label="Cap rate" value={percent(preview.capRate)} />
          <Metric label="Cash-on-cash" value={percent(preview.cashOnCash)} tone={preview.cashOnCash >= 0 ? "pos" : "neg"} />
        </div>

        {err && <p className="text-sm text-destructive">{err}</p>}

        <DialogFooter className="sticky bottom-0 -mx-6 border-t bg-background px-6 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving} data-testid="button-save">
            {saving ? "Saving…" : editing ? "Save changes" : "Add property"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg";
}) {
  const color =
    tone === "pos"
      ? "text-success"
      : tone === "neg"
        ? "text-destructive"
        : "text-foreground";
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`num text-sm font-semibold ${color}`}>{value}</span>
    </div>
  );
}
