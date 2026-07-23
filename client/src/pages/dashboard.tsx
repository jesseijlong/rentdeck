import { Fragment, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { type Property, type InsertProperty, type Maintenance, type Checklist } from "@shared/schema";
import { computeMetrics, sumPortfolio } from "@/lib/metrics";
import { currency, percent, signedCurrency, formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import {
  propertiesToCsv,
  downloadCsv,
  parseCsv,
  rowsToProperties,
} from "@/lib/csv";
import { SAMPLE_PROPERTIES, SAMPLE_MAINTENANCE } from "@/lib/sampleData";
import { templateItems, checklistTitle, type ChecklistType } from "@/lib/checklistTemplates";
import { getLeaseAlerts, getLeaseStatus, formatDaysLeft } from "@/lib/lease";
import { PropertyForm } from "@/components/PropertyForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MaintenanceView, maintenanceForProperty } from "@/components/MaintenanceView";
import { LogOut } from "lucide-react";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronRight,
  Download,
  Upload,
  Building2,
  Wallet,
  TrendingUp,
  PiggyBank,
  Database,
  Wrench,
  DoorOpen,
  ClipboardList,
  ExternalLink,
  Users,
  AlertTriangle,
  Phone,
  Mail,
} from "lucide-react";

export default function Dashboard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);
  const [detailTarget, setDetailTarget] = useState<Property | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Property | null>(null);
  const [view, setView] = useState<"portfolio" | "maintenance" | "vacancy" | "renters">("portfolio");
  const fileRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/properties");
      return res.json();
    },
  });

  const { data: maintenanceItems = [] } = useQuery<Maintenance[]>({
    queryKey: ["/api/maintenance"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/maintenance");
      return res.json();
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/properties"] });

  const leaseAlerts = useMemo(() => getLeaseAlerts(properties), [properties]);

  const createMut = useMutation({
    mutationFn: (data: InsertProperty) =>
      apiRequest("POST", "/api/properties", data),
    onSuccess: () => {
      invalidate();
      toast({ title: "Property added" });
    },
    onError: () => toast({ title: "Failed to add property", variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: InsertProperty }) =>
      apiRequest("PUT", `/api/properties/${id}`, data),
    onSuccess: () => {
      invalidate();
      toast({ title: "Property updated" });
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/properties/${id}`),
    onSuccess: () => {
      invalidate();
      toast({ title: "Property deleted" });
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const replaceMut = useMutation({
    mutationFn: (items: InsertProperty[]) =>
      apiRequest("POST", "/api/properties/replace", items),
    onSuccess: () => invalidate(),
  });

  const statusMut = useMutation({
    mutationFn: async ({ property, status }: { property: Property; status: string }) => {
      const { id: _id, createdAt: _c, ...rest } = property;
      return apiRequest("PUT", `/api/properties/${property.id}`, { ...rest, status });
    },
    onSuccess: () => invalidate(),
  });

  const createChecklistMut = useMutation({
    mutationFn: async ({ propertyId, type }: { propertyId: number; type: ChecklistType }) => {
      const body = {
        propertyId,
        type,
        title: checklistTitle(type),
        visitDate: new Date().toISOString().slice(0, 10),
        items: JSON.stringify(templateItems(type)),
        notes: "",
      };
      const res = await apiRequest("POST", "/api/checklists", body);
      return (await res.json()) as Checklist;
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["/api/checklists"] });
      qc.invalidateQueries({ queryKey: ["/api/properties", detailTarget?.id, "checklists"] });
      setDetailTarget(null);
      setLocation(`/checklist/${created.id}`);
    },
    onError: () => toast({ title: "Failed to create checklist", variant: "destructive" }),
  });

  const portfolio = useMemo(() => sumPortfolio(properties), [properties]);

  const chartData = useMemo(
    () =>
      properties.map((p) => ({
        name: p.name,
        cashFlow: Number(computeMetrics(p).monthlyCashFlow.toFixed(0)),
      })),
    [properties]
  );

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (p: Property) => {
    setEditing(p);
    setFormOpen(true);
  };

  const handleSave = async (data: InsertProperty) => {
    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, data });
    } else {
      await createMut.mutateAsync(data);
    }
  };

  const loadSample = async () => {
    await replaceMut.mutateAsync(SAMPLE_PROPERTIES);
    // fetch freshly-created properties to get their IDs, then seed maintenance
    const res = await apiRequest("GET", "/api/properties");
    const fresh: Property[] = await res.json();
    await Promise.all(
      SAMPLE_MAINTENANCE.map((m, i) => {
        if (fresh.length === 0) return Promise.resolve();
        const propertyId = fresh[i % fresh.length].id;
        return apiRequest("POST", "/api/maintenance", { ...m, propertyId });
      })
    );
    qc.invalidateQueries({ queryKey: ["/api/maintenance"] });
    toast({ title: "Sample data loaded" });
  };

  const clearAll = async () => {
    await replaceMut.mutateAsync([]);
    toast({ title: "All properties cleared" });
  };

  const exportCsv = () => {
    if (properties.length === 0) {
      toast({ title: "No properties to export" });
      return;
    }
    downloadCsv(`rental-portfolio-${new Date().toISOString().slice(0, 10)}.csv`, propertiesToCsv(properties));
  };

  const onImportFile = async (file: File) => {
    const text = await file.text();
    try {
      const rows = parseCsv(text);
      if (rows.length === 0) {
        toast({ title: "No rows found in CSV", variant: "destructive" });
        return;
      }
      const items = rowsToProperties(rows);
      await replaceMut.mutateAsync(items as InsertProperty[]);
      toast({ title: `Imported ${items.length} properties` });
    } catch {
      toast({ title: "Could not parse CSV", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 size={20} />
            </div>
            <div className="leading-tight">
              <div className="text-base font-semibold tracking-tight">JASSOP GROUP</div>
              <div className="hidden text-xs text-muted-foreground sm:block">Portfolio tracker</div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImportFile(f);
                e.target.value = "";
              }}
            />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="hidden sm:inline-flex">
              <Upload size={15} className="mr-1.5" /> Import
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} className="hidden sm:inline-flex">
              <Download size={15} className="mr-1.5" /> Export
            </Button>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Sign out"
              data-testid="button-logout"
              onClick={async () => {
                await fetch(`${"__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__"}/api/auth/logout`, { method: "POST" });
                window.location.reload();
              }}
            >
              <LogOut size={16} />
            </Button>
            <Button size="sm" onClick={openAdd} data-testid="button-add" className="px-2.5 sm:px-3">
              <Plus size={16} className="sm:mr-1.5" />
              <span className="hidden sm:inline">Add property</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {/* View tabs */}
        <div className="mb-5 inline-flex items-center gap-1 rounded-lg border bg-card p-1">
          <TabButton active={view === "portfolio"} onClick={() => setView("portfolio")} icon={<Database size={15} />}>
            Portfolio
          </TabButton>
          <TabButton active={view === "maintenance"} onClick={() => setView("maintenance")} icon={<Wrench size={15} />}>
            Maintenance
            {maintenanceItems.filter((m) => m.status === "Open").length > 0 && (
              <span className="num ml-1.5 rounded-full bg-amber-500/20 px-1.5 py-px text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                {maintenanceItems.filter((m) => m.status === "Open").length}
              </span>
            )}
          </TabButton>
          <TabButton active={view === "vacancy"} onClick={() => setView("vacancy")} icon={<DoorOpen size={15} />}>
            Vacancy
            {properties.filter((p) => p.status !== "Occupied").length > 0 && (
              <span className="num ml-1.5 rounded-full bg-rose-500/20 px-1.5 py-px text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                {properties.filter((p) => p.status !== "Occupied").length}
              </span>
            )}
          </TabButton>
          <TabButton active={view === "renters"} onClick={() => setView("renters")} icon={<Users size={15} />}>
            Renters
            {leaseAlerts.length > 0 && (
              <span className="num ml-1.5 rounded-full bg-amber-500/20 px-1.5 py-px text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                {leaseAlerts.length}
              </span>
            )}
          </TabButton>
        </div>

        {leaseAlerts.length > 0 && view !== "renters" && (
          <button
            onClick={() => setView("renters")}
            className="mb-5 flex w-full items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-left text-sm text-amber-700 hover:bg-amber-500/15 dark:text-amber-400"
            data-testid="banner-lease-alerts"
          >
            <AlertTriangle size={15} className="shrink-0" />
            <span>
              {leaseAlerts.length} lease{leaseAlerts.length === 1 ? "" : "s"}{" "}
              {leaseAlerts.some((a) => a.expired) ? "expired or expiring soon" : "expiring soon"} — view Renters
            </span>
          </button>
        )}

        {view === "maintenance" ? (
          <MaintenanceView properties={properties} />
        ) : view === "vacancy" ? (
          <VacancyView
            properties={properties}
            onSetStatus={(property, status) => statusMut.mutate({ property, status })}
            onOpenDetail={setDetailTarget}
          />
        ) : view === "renters" ? (
          <RentersView properties={properties} onOpenDetail={setDetailTarget} />
        ) : (
          <>
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Kpi label="Properties" value={String(properties.length)} icon={<Database size={16} />} />
          <Kpi label="Portfolio value" value={currency(portfolio.currentValue, { compact: true })} icon={<Building2 size={16} />} />
          <Kpi label="Monthly rent" value={currency(portfolio.monthlyRent, { compact: true })} icon={<Wallet size={16} />} />
          <Kpi
            label="Monthly cash flow"
            value={signedCurrency(portfolio.monthlyCashFlow, { compact: true })}
            tone={portfolio.monthlyCashFlow >= 0 ? "pos" : "neg"}
            icon={<TrendingUp size={16} />}
          />
          <Kpi
            label="Annual cash flow"
            value={signedCurrency(portfolio.annualCashFlow, { compact: true })}
            tone={portfolio.annualCashFlow >= 0 ? "pos" : "neg"}
            icon={<PiggyBank size={16} />}
          />

        </div>

        {/* Chart */}
        {properties.length > 0 && (
          <Card className="mt-6 p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Monthly cash flow by property</h2>
                <p className="text-xs text-muted-foreground">Net monthly after all expenses</p>
              </div>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    stroke="hsl(var(--border))"
                    tickLine={false}
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                    height={64}
                    tickFormatter={(v: string) => (v.length > 24 ? v.slice(0, 23) + "…" : v)}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    stroke="hsl(var(--border))"
                    tickLine={false}
                    width={48}
                    tickFormatter={(v) => currency(Number(v), { compact: true })}
                  />
                  <RTooltip
                    cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--popover-border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [currency(v), "Cash flow"]}
                  />
                  <Bar dataKey="cashFlow" radius={[4, 4, 0, 0]}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={d.cashFlow >= 0 ? "hsl(var(--chart-1))" : "hsl(var(--chart-5))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Table */}
        <Card className="mt-6 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : properties.length === 0 ? (
            <EmptyState onAdd={openAdd} onSample={loadSample} busy={replaceMut.isPending} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="w-8 px-3 py-2.5" />
                    <th className="px-3 py-2.5 font-medium">Property</th>
                    <th className="px-3 py-2.5 text-right font-medium">Rent</th>
                    <th className="px-3 py-2.5 text-right font-medium">Expenses</th>
                    <th className="px-3 py-2.5 text-right font-medium">Cash flow</th>
                    <th className="px-3 py-2.5 text-right font-medium">Value</th>

                    <th className="w-10 px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {properties.map((p) => {
                    const m = computeMetrics(p);
                    return (
                      <Fragment key={p.id}>
                        <tr className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-3 py-2.5">
                            <button
                              onClick={() => setDetailTarget(p)}
                              className="text-muted-foreground hover:text-foreground"
                              aria-label="View details"
                              data-testid={`button-expand-${p.id}`}
                            >
                              <ChevronRight size={16} />
                            </button>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{p.name}</span>
                              {p.status !== "Occupied" && (
                                <Badge variant="outline" className={`whitespace-nowrap border ${STATUS_TONE[p.status] ?? ""}`}>
                                  {p.status}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {p.address}{p.address && p.city ? ", " : ""}{p.city}{p.city && p.state ? ", " : ""}{p.state} {p.zip}
                            </div>
                          </td>
                          <td className="num px-3 py-2.5 text-right">{currency(p.monthlyRent)}</td>
                          <td className="num px-3 py-2.5 text-right text-muted-foreground">{currency(m.totalMonthlyExpenses)}</td>
                          <td className={`num px-3 py-2.5 text-right font-medium ${m.monthlyCashFlow >= 0 ? "text-success" : "text-destructive"}`}>
                            {currency(m.monthlyCashFlow)}
                          </td>
                          <td className="num px-3 py-2.5 text-right">{currency(p.currentValue)}</td>

                          <td className="px-2 py-2.5">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-menu-${p.id}`}>
                                  <MoreHorizontal size={16} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEdit(p)}>
                                  <Pencil size={14} className="mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDetailTarget(p)}>
                                  <ChevronRight size={14} className="mr-2" />
                                  View details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteTarget(p)}
                                >
                                  <Trash2 size={14} className="mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {properties.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Button variant="ghost" size="sm" onClick={loadSample} disabled={replaceMut.isPending}>
              Load sample data
            </Button>
            <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()} className="sm:hidden">
              <Upload size={14} className="mr-1.5" /> Import
            </Button>
            <Button variant="ghost" size="sm" onClick={exportCsv} className="sm:hidden">
              <Download size={14} className="mr-1.5" /> Export
            </Button>
            <Button variant="ghost" size="sm" onClick={clearAll} disabled={replaceMut.isPending} className="text-destructive hover:text-destructive">
              Clear all
            </Button>
            <span className="ml-auto hidden sm:inline">
              Portfolio value {currency(portfolio.currentValue)} · Net annual cash flow {currency(portfolio.annualCashFlow)}
            </span>
          </div>
        )}
          </>
        )}
      </main>

      <PropertyForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSave={handleSave}
        editing={editing}
      />

      <DeleteDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteMut.mutateAsync(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />

      <Dialog open={!!detailTarget} onOpenChange={(o) => !o && setDetailTarget(null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailTarget?.name}</DialogTitle>
            <DialogDescription>
              {detailTarget?.address}
              {detailTarget?.address && detailTarget?.city ? ", " : ""}
              {detailTarget?.city}
              {detailTarget?.city && detailTarget?.state ? ", " : ""}
              {detailTarget?.state} {detailTarget?.zip}
            </DialogDescription>
          </DialogHeader>
          {detailTarget && (
            <DetailPanel
              p={detailTarget}
              m={computeMetrics(detailTarget)}
              maint={maintenanceForProperty(maintenanceItems, detailTarget.id)}
            />
          )}
          {detailTarget && (
            <ChecklistsCard
              propertyId={detailTarget.id}
              busy={createChecklistMut.isPending}
              onCreate={(type) => createChecklistMut.mutate({ propertyId: detailTarget.id, type })}
              onOpen={(id) => {
                setDetailTarget(null);
                setLocation(`/checklist/${id}`);
              }}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailTarget(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                openEdit(detailTarget);
                setDetailTarget(null);
              }}
            >
              <Pencil size={14} className="mr-1.5" /> Edit property
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  Occupied: "text-success border-success/40",
  Vacant: "text-rose-600 dark:text-rose-400 border-rose-500/40",
  Turnover: "text-amber-600 dark:text-amber-400 border-amber-500/40",
};

function VacancyView({
  properties,
  onSetStatus,
  onOpenDetail,
}: {
  properties: Property[];
  onSetStatus: (p: Property, status: string) => void;
  onOpenDetail: (p: Property) => void;
}) {
  const vacant = properties.filter((p) => p.status !== "Occupied");
  const occupied = properties.filter((p) => p.status === "Occupied");
  if (properties.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">
        No properties yet. Add a property to track occupancy.
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <Kpi label="Total units" value={String(properties.length)} icon={<Database size={16} />} />
        <Kpi label="Occupied" value={String(occupied.length)} icon={<Building2 size={16} />} />
        <Kpi
          label="Vacant / turnover"
          value={String(vacant.length)}
          tone={vacant.length > 0 ? "neg" : "pos"}
          icon={<DoorOpen size={16} />}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b bg-muted/40 px-4 py-3 text-sm font-semibold">Vacant & turnover</div>
        {vacant.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">All properties are occupied.</div>
        ) : (
          <div className="divide-y">
            {vacant.map((p) => (
              <div key={p.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.name}</span>
                    <Badge variant="outline" className={`whitespace-nowrap border ${STATUS_TONE[p.status] ?? ""}`}>
                      {p.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.address}{p.address && p.city ? ", " : ""}{p.city}, {p.state} {p.zip}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Select value={p.status} onValueChange={(v) => onSetStatus(p, v)}>
                    <SelectTrigger className="h-8 w-36" data-testid={`select-vac-status-${p.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Occupied">Occupied</SelectItem>
                      <SelectItem value="Vacant">Vacant</SelectItem>
                      <SelectItem value="Turnover">Turnover</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => onOpenDetail(p)}>
                    Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b bg-muted/40 px-4 py-3 text-sm font-semibold">Occupied ({occupied.length})</div>
        <div className="divide-y">
          {occupied.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  {p.address}{p.address && p.city ? ", " : ""}{p.city}, {p.state} {p.zip}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onSetStatus(p, "Vacant")}>
                Mark vacant
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function RentersView({
  properties,
  onOpenDetail,
}: {
  properties: Property[];
  onOpenDetail: (p: Property) => void;
}) {
  const withTenant = properties.filter((p) => p.tenantName || p.tenantPhone || p.tenantEmail);
  const withoutTenant = properties.filter((p) => !p.tenantName && !p.tenantPhone && !p.tenantEmail);
  const alerts = useMemo(() => getLeaseAlerts(properties), [properties]);

  if (properties.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">
        No properties yet. Add a property to track renters.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <Kpi label="Total units" value={String(properties.length)} icon={<Database size={16} />} />
        <Kpi label="With renter on file" value={String(withTenant.length)} icon={<Users size={16} />} />
        <Kpi
          label="Lease alerts"
          value={String(alerts.length)}
          tone={alerts.length > 0 ? "neg" : "pos"}
          icon={<AlertTriangle size={16} />}
        />
      </div>

      {alerts.length > 0 && (
        <Card className="overflow-hidden border-amber-500/40">
          <div className="border-b bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-700 dark:text-amber-400">
            Lease expiring or expired
          </div>
          <div className="divide-y">
            {alerts.map((a) => (
              <button
                key={a.property.id}
                onClick={() => onOpenDetail(a.property)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <div className="font-medium">{a.property.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {a.property.tenantName || "No tenant name on file"}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`whitespace-nowrap border ${
                    a.expired
                      ? "text-rose-600 dark:text-rose-400 border-rose-500/40"
                      : "text-amber-600 dark:text-amber-400 border-amber-500/40"
                  }`}
                >
                  {formatDaysLeft(a.daysLeft)}
                </Badge>
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="border-b bg-muted/40 px-4 py-3 text-sm font-semibold">All renters</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Property</th>
                <th className="px-3 py-2.5 font-medium">Tenant</th>
                <th className="px-3 py-2.5 font-medium">Contact</th>
                <th className="px-3 py-2.5 font-medium">Lease</th>
                <th className="px-3 py-2.5 text-right font-medium">Deposit</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {withTenant.map((p) => {
                const status = getLeaseStatus(p);
                return (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.address}</div>
                    </td>
                    <td className="px-3 py-2.5">{p.tenantName || "—"}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col gap-0.5 text-xs">
                        {p.tenantPhone && (
                          <span className="flex items-center gap-1"><Phone size={11} />{p.tenantPhone}</span>
                        )}
                        {p.tenantEmail && (
                          <span className="flex items-center gap-1 truncate"><Mail size={11} />{p.tenantEmail}</span>
                        )}
                        {!p.tenantPhone && !p.tenantEmail && <span className="text-muted-foreground">—</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {p.leaseStart || p.leaseEnd ? (
                        <div>
                          <div className="text-xs">
                            {formatDate(p.leaseStart) || "—"} → {formatDate(p.leaseEnd) || "—"}
                          </div>
                          {(status.expired || status.expiringSoon) && (
                            <Badge
                              variant="outline"
                              className={`mt-0.5 whitespace-nowrap border text-[11px] ${
                                status.expired
                                  ? "text-rose-600 dark:text-rose-400 border-rose-500/40"
                                  : "text-amber-600 dark:text-amber-400 border-amber-500/40"
                              }`}
                            >
                              {formatDaysLeft(status.daysLeft)}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="num px-3 py-2.5 text-right">{p.deposit ? currency(p.deposit) : "—"}</td>
                    <td className="px-3 py-2.5 text-right">
                      <Button variant="ghost" size="sm" onClick={() => onOpenDetail(p)}>
                        Details
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {withTenant.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No renters recorded yet. Add tenant info from a property's Edit form.
          </div>
        )}
      </Card>

      {withoutTenant.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/40 px-4 py-3 text-sm font-semibold">
            No renter on file ({withoutTenant.length})
          </div>
          <div className="divide-y">
            {withoutTenant.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.address}</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => onOpenDetail(p)}>
                  Add renter
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function ChecklistsCard({
  propertyId,
  busy,
  onCreate,
  onOpen,
}: {
  propertyId: number;
  busy: boolean;
  onCreate: (type: ChecklistType) => void;
  onOpen: (id: number) => void;
}) {
  const { data: items = [] } = useQuery<Checklist[]>({
    queryKey: ["/api/properties", propertyId, "checklists"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/properties/${propertyId}/checklists`);
      return res.json();
    },
  });
  const recent = [...items].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <ClipboardList size={13} /> Checklists
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => onCreate("new-tenant")}
          data-testid="button-new-tenant-checklist"
        >
          <ClipboardList size={14} className="mr-1.5" /> New tenant checklist
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => onCreate("monthly-visit")}
          data-testid="button-monthly-visit-checklist"
        >
          <ClipboardList size={14} className="mr-1.5" /> Monthly visit checklist
        </Button>
      </div>
      {recent.length > 0 && (
        <div className="mt-3 space-y-1">
          <div className="text-xs text-muted-foreground">Saved checklists</div>
          {recent.map((c) => (
            <button
              key={c.id}
              onClick={() => onOpen(c.id)}
              className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/50"
            >
              <span className="flex items-center gap-1.5 truncate">
                <ExternalLink size={13} className="shrink-0 text-muted-foreground" />
                <span className="truncate">{c.title || c.type}</span>
              </span>
              <span className="num shrink-0 text-xs text-muted-foreground">{formatDate(c.visitDate) || "no date"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "pos" | "neg";
  icon?: React.ReactNode;
}) {
  const color =
    tone === "pos" ? "text-success" : tone === "neg" ? "text-destructive" : "text-foreground";
  return (
    <Card className="p-3 sm:p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={`num mt-1 text-lg font-semibold sm:text-xl ${color}`}>{value}</div>
      {sub && <div className="num text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function DetailPanel({
  p,
  m,
  maint,
}: {
  p: Property;
  m: ReturnType<typeof computeMetrics>;
  maint: { items: import("@shared/schema").Maintenance[]; open: number; spend: number };
}) {
  const lines = [
    { label: "Property type", value: p.propertyType },
    { label: "Purchased", value: `${formatDate(p.purchaseDate)} · ${currency(p.purchasePrice)}` },
    { label: "Current value", value: currency(p.currentValue) },
    { label: "Appreciation", value: signedCurrency(m.appreciation), tone: m.appreciation >= 0 ? "pos" : "neg" },
  ];
  const income = [
    { label: "Gross monthly rent", value: currency(p.monthlyRent) },
    { label: "Other income", value: currency(p.otherIncome) },
    { label: "Vacancy loss", value: `-${currency((p.monthlyRent + p.otherIncome) * (p.vacancyRate / 100))}` },
    { label: "Effective gross income", value: currency(m.effectiveGrossIncome), strong: true },
  ];
  const expenses = [
    { label: "Property taxes", value: currency(p.propertyTaxes) },
    { label: "Insurance", value: currency(p.insurance) },
    { label: "Maintenance", value: currency(p.maintenance) },
    { label: "HOA", value: currency(p.hoa) },
    { label: "Property management", value: currency(p.propertyManagement) },
    { label: "Utilities", value: currency(p.utilities) },
    { label: "CapEx reserve", value: currency(p.capexReserve) },
    { label: "Other expenses", value: currency(p.otherExpenses) },
    { label: "Operating expenses", value: currency(m.operatingExpensesMonthly), strong: true },
  ];
  const returns = [
    { label: "NOI (annual)", value: currency(m.noi) },
    { label: "Monthly cash flow", value: currency(m.monthlyCashFlow), tone: m.monthlyCashFlow >= 0 ? "pos" : "neg" },
    { label: "Annual cash flow", value: currency(m.annualCashFlow), tone: m.annualCashFlow >= 0 ? "pos" : "neg" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <DetailCol title="Property">
        {lines.map((l) => (
          <Row key={l.label} {...l} />
        ))}
      </DetailCol>
      <DetailCol title="Income (monthly)">
        {income.map((l) => (
          <Row key={l.label} {...l} />
        ))}
      </DetailCol>
      <DetailCol title="Expenses (monthly)">
        {expenses.map((l) => (
          <Row key={l.label} {...l} />
        ))}
      </DetailCol>
      <DetailCol title="Returns">
        {returns.map((l) => (
          <Row key={l.label} {...l} />
        ))}
      </DetailCol>
      <DetailCol title="Renter">
        {(() => {
          const lease =
            p.leaseStart || p.leaseEnd
              ? `${formatDate(p.leaseStart) || "—"} → ${formatDate(p.leaseEnd) || "—"}`
              : "";
          const rows: { label: string; value: string }[] = [];
          if (p.tenantName) rows.push({ label: "Name", value: p.tenantName });
          if (p.tenantPhone) rows.push({ label: "Phone", value: p.tenantPhone });
          if (p.tenantEmail) rows.push({ label: "Email", value: p.tenantEmail });
          if (lease) rows.push({ label: "Lease", value: lease });
          if (p.deposit) rows.push({ label: "Deposit", value: currency(p.deposit) });
          if (rows.length === 0) {
            return (
              <div className="py-1 text-xs text-muted-foreground">No renter recorded.</div>
            );
          }
          return (
            <>
              {rows.map((l) => (
                <Row key={l.label} {...l} />
              ))}
              {p.tenantNotes && (
                <div className="pt-1 text-xs text-muted-foreground">{p.tenantNotes}</div>
              )}
            </>
          );
        })()}
      </DetailCol>
      {maint.items.length > 0 && (
        <DetailCol title="Maintenance">
          <Row label="Total spend" value={currency(maint.spend)} strong />
          <Row label="Open items" value={String(maint.open)} tone={maint.open > 0 ? "neg" : undefined} />
          <div className="space-y-1 pt-1">
            {maint.items.slice(0, 4).map((it) => (
              <div key={it.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-muted-foreground">{it.title}</span>
                <span className="num shrink-0">{currency(it.cost)}</span>
              </div>
            ))}
            {maint.items.length > 4 && (
              <div className="text-xs text-muted-foreground">+{maint.items.length - 4} more</div>
            )}
          </div>
        </DetailCol>
      )}
      {p.notes && (
        <div className="sm:col-span-2 lg:col-span-3 rounded-md border bg-background p-3 text-sm">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Notes</span>
          <p className="mt-1 whitespace-pre-wrap">{p.notes}</p>
        </div>
      )}
    </div>
  );
}

function DetailCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
  strong,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg";
  strong?: boolean;
}) {
  const color =
    tone === "pos" ? "text-success" : tone === "neg" ? "text-destructive" : "text-foreground";
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`num ${strong ? "font-semibold" : ""} ${color}`}>{value}</span>
    </div>
  );
}

function EmptyState({ onAdd, onSample, busy }: { onAdd: () => void; onSample: () => void; busy: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Building2 size={28} />
      </div>
      <h3 className="mt-4 text-lg font-semibold">No properties yet</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Add your first rental property to start tracking income, expenses, and performance metrics.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button onClick={onAdd} data-testid="button-add-empty">
          <Plus size={16} className="mr-1.5" /> Add property
        </Button>
        <Button variant="outline" onClick={onSample} disabled={busy}>
          Load sample data
        </Button>
      </div>
    </div>
  );
}

function DeleteDialog({
  target,
  onClose,
  onConfirm,
}: {
  target: Property | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete property?</DialogTitle>
          <DialogDescription>
            This will permanently remove "{target?.name}" from your portfolio. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} data-testid="button-confirm-delete">
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
