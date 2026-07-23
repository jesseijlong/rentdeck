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
import { currency } from "@/lib/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type InsertMaintenance,
  type Maintenance,
  type Property,
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_STATUSES,
  MAINTENANCE_PRIORITIES,
} from "@shared/schema";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (data: InsertMaintenance) => Promise<void>;
  editing?: Maintenance | null;
  properties: Property[];
  defaultPropertyId?: number | null;
};

const EMPTY = (propertyId: number): InsertMaintenance => ({
  propertyId,
  title: "",
  category: "General",
  status: "Open",
  priority: "Medium",
  requestDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
  completedDate: "",
  cost: 0,
  estimatedPartsCost: 0,
  estimatedLaborCost: 0,
  actualPartsCost: 0,
  actualLaborCost: 0,
  vendor: "",
  invoiceRef: "",
  notes: "",
});

export function MaintenanceForm({
  open,
  onOpenChange,
  onSave,
  editing,
  properties,
  defaultPropertyId,
}: Props) {
  const [form, setForm] = useState<InsertMaintenance>(EMPTY(defaultPropertyId ?? 0));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setErr(null);
      if (editing) {
        const { id: _id, createdAt: _c, ...rest } = editing;
        setForm(rest);
      } else {
        setForm(EMPTY(defaultPropertyId ?? properties[0]?.id ?? 0));
      }
    }
  }, [open, editing, defaultPropertyId, properties]);

  const set = <K extends keyof InsertMaintenance>(k: K, v: InsertMaintenance[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const estimateTotal = (form.estimatedPartsCost || 0) + (form.estimatedLaborCost || 0);
  const actualTotal = (form.actualPartsCost || 0) + (form.actualLaborCost || 0);

  const submit = async () => {
    setErr(null);
    if (!form.title.trim()) {
      setErr("A short title is required.");
      return;
    }
    if (!form.propertyId) {
      setErr("Select a property.");
      return;
    }
    setSaving(true);
    try {
      const actualTotal = (form.actualPartsCost || 0) + (form.actualLaborCost || 0);
      const estimateTotal = (form.estimatedPartsCost || 0) + (form.estimatedLaborCost || 0);
      const payload = { ...form, cost: actualTotal || estimateTotal };
      await onSave(payload);
      onOpenChange(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  if (properties.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>No properties yet</DialogTitle>
            <DialogDescription>
              Add a property first, then you can log maintenance work against it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit maintenance record" : "Log maintenance"}</DialogTitle>
          <DialogDescription>
            Track repairs, vendors, and estimated vs. actual parts/labor costs. Completed items roll up into per-property spend.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-2">
          <div className="col-span-2 grid gap-1.5">
            <Label htmlFor="m-title">Title</Label>
            <Input
              id="m-title"
              data-testid="input-maint-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Kitchen sink leak"
            />
          </div>

          <div className="col-span-2 grid gap-1.5">
            <Label htmlFor="m-prop">Property</Label>
            <Select
              value={String(form.propertyId)}
              onValueChange={(v) => set("propertyId", Number(v))}
            >
              <SelectTrigger id="m-prop" data-testid="select-maint-prop">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Field label="Category">
            <Select value={form.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger data-testid="select-maint-cat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MAINTENANCE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger data-testid="select-maint-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MAINTENANCE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MAINTENANCE_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Request date">
            <Input
              type="date"
              value={form.requestDate}
              onChange={(e) => set("requestDate", e.target.value)}
            />
          </Field>
          <Field label="Due / scheduled">
            <Input
              type="date"
              value={form.dueDate}
              onChange={(e) => set("dueDate", e.target.value)}
            />
          </Field>
          {form.status === "Completed" && (
            <Field label="Completed date">
              <Input
                type="date"
                value={form.completedDate}
                onChange={(e) => set("completedDate", e.target.value)}
              />
            </Field>
          )}
          <Field label="Vendor / contractor">
            <Input
              value={form.vendor}
              onChange={(e) => set("vendor", e.target.value)}
              placeholder="ABC Plumbing"
            />
          </Field>
          <Field label="Invoice ref">
            <Input
              value={form.invoiceRef}
              onChange={(e) => set("invoiceRef", e.target.value)}
              placeholder="INV-1042"
            />
          </Field>
          <div className="col-span-2 mt-1 rounded-lg border bg-muted/30 p-3">
            <div className="mb-2.5 flex items-center justify-between">
              <h4 className="text-sm font-semibold">Estimate &amp; cost</h4>
              <span className="text-xs text-muted-foreground">
                Total: {currency(estimateTotal)} est. · {currency(actualTotal)} actual
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              <Field label="Est. parts">
                <Input
                  type="number"
                  inputMode="decimal"
                  data-testid="input-maint-est-parts"
                  value={form.estimatedPartsCost === 0 ? "" : String(form.estimatedPartsCost)}
                  onChange={(e) =>
                    set("estimatedPartsCost", e.target.value === "" ? 0 : Number(e.target.value))
                  }
                  placeholder="0"
                />
              </Field>
              <Field label="Est. labor">
                <Input
                  type="number"
                  inputMode="decimal"
                  data-testid="input-maint-est-labor"
                  value={form.estimatedLaborCost === 0 ? "" : String(form.estimatedLaborCost)}
                  onChange={(e) =>
                    set("estimatedLaborCost", e.target.value === "" ? 0 : Number(e.target.value))
                  }
                  placeholder="0"
                />
              </Field>
              <Field label="Actual parts">
                <Input
                  type="number"
                  inputMode="decimal"
                  data-testid="input-maint-actual-parts"
                  value={form.actualPartsCost === 0 ? "" : String(form.actualPartsCost)}
                  onChange={(e) =>
                    set("actualPartsCost", e.target.value === "" ? 0 : Number(e.target.value))
                  }
                  placeholder="0"
                />
              </Field>
              <Field label="Actual labor">
                <Input
                  type="number"
                  inputMode="decimal"
                  data-testid="input-maint-actual-labor"
                  value={form.actualLaborCost === 0 ? "" : String(form.actualLaborCost)}
                  onChange={(e) =>
                    set("actualLaborCost", e.target.value === "" ? 0 : Number(e.target.value))
                  }
                  placeholder="0"
                />
              </Field>
            </div>
          </div>

          <div className="col-span-2 grid gap-1.5">
            <Label htmlFor="m-notes">Notes</Label>
            <Textarea
              id="m-notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              placeholder="What was done, parts used, warranty info…"
            />
          </div>
        </div>

        {err && <p className="text-sm text-destructive">{err}</p>}

        <DialogFooter className="sticky bottom-0 -mx-6 border-t bg-background px-6 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving} data-testid="button-maint-save">
            {saving ? "Saving…" : editing ? "Save changes" : "Add record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
