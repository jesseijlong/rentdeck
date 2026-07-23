import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import type { Checklist, Property } from "@shared/schema";
import { formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Printer, ExternalLink, Trash2, Check } from "lucide-react";

interface ChecklistItem {
  label: string;
  checked: boolean;
}

export default function ChecklistPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [location] = useLocation();
  const id = Number(location.split("/").pop());

  const { data: checklist, isLoading } = useQuery<Checklist>({
    queryKey: ["/api/checklists", id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/checklists/${id}`);
      return res.json();
    },
    enabled: Number.isFinite(id),
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/properties");
      return res.json();
    },
  });

  const property = useMemo(
    () => properties.find((p) => p.id === checklist?.propertyId),
    [properties, checklist?.propertyId]
  );

  const [items, setItems] = useState<ChecklistItem[] | null>(null);
  const [visitDate, setVisitDate] = useState("");
  const [notes, setNotes] = useState("");
  const [title, setTitle] = useState("");

  // sync local state once checklist loads
  const loadedKey = checklist?.createdAt;
  const [syncedKey, setSyncedKey] = useState<number | undefined>(undefined);
  if (checklist && loadedKey !== syncedKey) {
    setSyncedKey(loadedKey);
    setItems(safeParseItems(checklist.items));
    setVisitDate(checklist.visitDate);
    setNotes(checklist.notes);
    setTitle(checklist.title);
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      return apiRequest("PUT", `/api/checklists/${id}`, {
        propertyId: checklist!.propertyId,
        type: checklist!.type,
        title,
        visitDate,
        items: JSON.stringify(items ?? []),
        notes,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/checklists", id] });
      qc.invalidateQueries({ queryKey: ["/api/properties", checklist?.propertyId, "checklists"] });
      toast({ title: "Checklist saved" });
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/checklists/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/properties", checklist?.propertyId, "checklists"] });
      window.location.hash = "#/";
    },
  });

  const toggle = (idx: number) => {
    setItems((prev) =>
      (prev ?? []).map((it, i) => (i === idx ? { ...it, checked: !it.checked } : it))
    );
  };

  if (isLoading) {
    return <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!checklist) {
    return (
      <div className="p-10 text-center text-sm text-muted-foreground">
        Checklist not found. <Link href="/" className="underline">Back to dashboard</Link>
      </div>
    );
  }

  const completed = (items ?? []).filter((i) => i.checked).length;
  const total = items?.length ?? 0;
  const printUrl = `${window.location.origin}${window.location.pathname}${window.location.search}#/checklist/${id}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Toolbar (hidden when printing) */}
      <div className="no-print mb-5 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => (window.location.hash = "#/")}>
          <ArrowLeft size={14} className="mr-1.5" /> Dashboard
        </Button>
        <span className="ml-auto" />
        <Button variant="outline" size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending} data-testid="button-save-checklist">
          <Check size={14} className="mr-1.5" /> {saveMut.isPending ? "Saving…" : "Save"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(printUrl, "_blank")}
          data-testid="button-open-printable"
        >
          <ExternalLink size={14} className="mr-1.5" /> Open printable
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()} data-testid="button-print">
          <Printer size={14} className="mr-1.5" /> Print
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => {
            if (confirm("Delete this checklist?")) deleteMut.mutate();
          }}
        >
          <Trash2 size={14} className="mr-1.5" /> Delete
        </Button>
      </div>

      <Card className="p-5 sm:p-7 print-area">
        <div className="border-b pb-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-transparent text-xl font-semibold focus:outline-none"
            data-testid="input-checklist-title"
          />
          <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:items-center sm:gap-4">
            <span className="font-medium text-foreground">
              {property?.name ?? "Property"}
            </span>
            <span>
              {property?.address}
              {property?.address && property?.city ? ", " : ""}
              {property?.city}
              {property?.city && property?.state ? ", " : ""}
              {property?.state} {property?.zip}
            </span>
          </div>
          <div className="no-print mt-2 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Date:</span>
            <Input
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              className="h-8 w-44"
              data-testid="input-checklist-date"
            />
          </div>
          <div className="hidden print:block mt-1 text-sm text-muted-foreground">
            Date: {formatDate(visitDate) || "—"}
          </div>
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          {completed} of {total} complete
        </div>
        <ul className="mt-2 space-y-1.5">
          {(items ?? []).map((it, i) => (
            <li key={i}>
              <label className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50 print:hover:bg-transparent">
                <input
                  type="checkbox"
                  checked={it.checked}
                  onChange={() => toggle(i)}
                  className="mt-0.5 h-4 w-4 shrink-0"
                  data-testid={`checkbox-item-${i}`}
                />
                <span className={`text-sm ${it.checked ? "text-muted-foreground line-through" : ""}`}>
                  {it.label}
                </span>
              </label>
            </li>
          ))}
        </ul>

        <div className="mt-5 border-t pt-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Notes
          </div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Observations, follow-ups, tenant comments…"
            className="no-print"
            data-testid="textarea-checklist-notes"
          />
          {notes && <div className="hidden print:block whitespace-pre-wrap text-sm">{notes}</div>}
        </div>
      </Card>
    </div>
  );
}

function safeParseItems(raw: string): ChecklistItem[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((it: unknown) => ({
        label: typeof (it as { label?: unknown })?.label === "string" ? (it as { label: string }).label : String((it as { label?: unknown })?.label ?? ""),
        checked: Boolean((it as { checked?: unknown })?.checked),
      }));
    }
  } catch {
    // ignore
  }
  return [];
}
