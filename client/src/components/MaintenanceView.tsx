import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  type Property,
  type InsertMaintenance,
  type Maintenance,
  MAINTENANCE_STATUSES,
} from "@shared/schema";
import { currency, formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { MaintenanceForm } from "@/components/MaintenanceForm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Wrench,
  AlertCircle,
  Clock,
  DollarSign,
} from "lucide-react";

const STATUS_TONE: Record<string, string> = {
  Open: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  "In Progress": "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  Completed: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  Cancelled: "bg-zinc-500/15 text-zinc-500 border-zinc-500/30",
};

const PRIORITY_TONE: Record<string, string> = {
  Low: "text-muted-foreground",
  Medium: "text-foreground",
  High: "text-amber-600 dark:text-amber-400",
  Urgent: "text-destructive",
};

export function ytdSpend(items: Maintenance[]): number {
  const year = new Date().getFullYear();
  return items
    .filter((m) => {
      const d = m.completedDate || m.requestDate;
      return d && new Date(d).getFullYear() === year;
    })
    .reduce((s, m) => s + m.cost, 0);
}

export function totalSpend(items: Maintenance[]): number {
  return items.reduce((s, m) => s + m.cost, 0);
}

export function maintenanceForProperty(items: Maintenance[], propertyId: number) {
  const sub = items.filter((m) => m.propertyId === propertyId);
  const open = sub.filter((m) => m.status === "Open" || m.status === "In Progress").length;
  const spend = sub.reduce((s, m) => s + m.cost, 0);
  return { items: sub, open, spend };
}

export function MaintenanceView({ properties }: { properties: Property[] }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Maintenance | null>(null);
  const [defaultProp, setDefaultProp] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Maintenance | null>(null);
  const [filterProp, setFilterProp] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: items = [], isLoading } = useQuery<Maintenance[]>({
    queryKey: ["/api/maintenance"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/maintenance");
      return res.json();
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["/api/maintenance"] });
  };

  const createMut = useMutation({
    mutationFn: (data: InsertMaintenance) => apiRequest("POST", "/api/maintenance", data),
    onSuccess: () => {
      invalidate();
      toast({ title: "Maintenance record added" });
    },
    onError: () => toast({ title: "Failed to add record", variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: InsertMaintenance }) =>
      apiRequest("PUT", `/api/maintenance/${id}`, data),
    onSuccess: () => {
      invalidate();
      toast({ title: "Maintenance record updated" });
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/maintenance/${id}`),
    onSuccess: () => {
      invalidate();
      toast({ title: "Record deleted" });
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const propName = (id: number) =>
    properties.find((p) => p.id === id)?.name ?? "Unknown property";

  const open = items.filter((m) => m.status === "Open").length;
  const inProgress = items.filter((m) => m.status === "In Progress").length;

  const filtered = useMemo(() => {
    return items
      .filter((m) => (filterProp === "all" ? true : m.propertyId === Number(filterProp)))
      .filter((m) => (filterStatus === "all" ? true : m.status === filterStatus))
      .sort((a, b) => {
        const da = String(a.requestDate || a.createdAt || "");
        const db = String(b.requestDate || b.createdAt || "");
        return db.localeCompare(da);
      });
  }, [items, filterProp, filterStatus]);

  const handleSave = async (data: InsertMaintenance) => {
    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, data });
    } else {
      await createMut.mutateAsync(data);
    }
  };

  const openAdd = (propertyId?: number) => {
    setEditing(null);
    setDefaultProp(propertyId ?? null);
    setFormOpen(true);
  };

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SumCard label="Open" value={String(open)} icon={<AlertCircle size={16} />} tone="amber" />
        <SumCard label="In progress" value={String(inProgress)} icon={<Clock size={16} />} tone="blue" />
        <SumCard label="YTD spend" value={currency(ytdSpend(items), { compact: true })} icon={<DollarSign size={16} />} />
        <SumCard label="Total spend" value={currency(totalSpend(items), { compact: true })} icon={<Wrench size={16} />} />
      </div>

      {/* Toolbar */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-lg font-semibold">Maintenance log</h2>
        <Select value={filterProp} onValueChange={setFilterProp}>
          <SelectTrigger className="h-9 w-[180px]" data-testid="select-filter-prop">
            <SelectValue placeholder="All properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All properties</SelectItem>
            {properties.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-[150px]" data-testid="select-filter-status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {MAINTENANCE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => openAdd()} disabled={properties.length === 0} data-testid="button-add-maint">
          <Plus size={16} className="mr-1.5" /> Log work
        </Button>
      </div>

      <Card className="mt-3 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Wrench size={24} />
            </div>
            <h3 className="mt-3 text-base font-semibold">
              {items.length === 0 ? "No maintenance logged" : "No records match these filters"}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {items.length === 0
                ? "Track repairs, vendor visits, and costs as they happen."
                : "Try clearing the property or status filter."}
            </p>
            {items.length === 0 && properties.length > 0 && (
              <Button className="mt-4" size="sm" onClick={() => openAdd()}>
                <Plus size={16} className="mr-1.5" /> Log maintenance
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2.5 font-medium">Item</th>
                  <th className="px-3 py-2.5 font-medium">Property</th>
                  <th className="px-3 py-2.5 font-medium">Category</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Priority</th>
                  <th className="px-3 py-2.5 text-right font-medium">Cost</th>
                  <th className="px-3 py-2.5 font-medium">Date</th>
                  <th className="w-10 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{m.title}</div>
                      {m.vendor && (
                        <div className="text-xs text-muted-foreground">{m.vendor}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{propName(m.propertyId)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{m.category}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className={`whitespace-nowrap border ${STATUS_TONE[m.status] ?? ""}`}>
                        {m.status}
                      </Badge>
                    </td>
                    <td className={`px-3 py-2.5 ${PRIORITY_TONE[m.priority] ?? ""}`}>{m.priority}</td>
                    <td className="num px-3 py-2.5 text-right">
                      {currency(m.cost)}
                      {(m.actualPartsCost > 0 || m.actualLaborCost > 0) && (
                        <div className="text-xs font-normal text-muted-foreground">
                          Parts {currency(m.actualPartsCost, { compact: true })} · Labor {currency(m.actualLaborCost, { compact: true })}
                        </div>
                      )}
                      {m.actualPartsCost === 0 &&
                        m.actualLaborCost === 0 &&
                        (m.estimatedPartsCost > 0 || m.estimatedLaborCost > 0) && (
                          <div className="text-xs font-normal text-muted-foreground">
                            Est. only
                          </div>
                        )}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {formatDate(m.completedDate || m.requestDate)}
                    </td>
                    <td className="px-2 py-2.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(m);
                              setDefaultProp(null);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil size={14} className="mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(m)}
                          >
                            <Trash2 size={14} className="mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <MaintenanceForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSave={handleSave}
        editing={editing}
        properties={properties}
        defaultPropertyId={defaultProp}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete maintenance record?</DialogTitle>
            <DialogDescription>
              This will permanently remove "{deleteTarget?.title}". This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (deleteTarget) await deleteMut.mutateAsync(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SumCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: "amber" | "blue";
}) {
  const color =
    tone === "amber"
      ? "text-amber-600 dark:text-amber-400"
      : tone === "blue"
        ? "text-blue-600 dark:text-blue-400"
        : "text-foreground";
  return (
    <Card className="p-3 sm:p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={`num mt-1 text-lg font-semibold sm:text-xl ${color}`}>{value}</div>
    </Card>
  );
}
