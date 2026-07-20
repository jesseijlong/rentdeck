import { Fragment, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type Property, type InsertProperty } from "@shared/schema";
import { computeMetrics, sumPortfolio } from "@/lib/metrics";
import { currency, percent, signedCurrency, formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import {
  propertiesToCsv,
  downloadCsv,
  parseCsv,
  rowsToProperties,
} from "@/lib/csv";
import { SAMPLE_PROPERTIES } from "@/lib/sampleData";
import { PropertyForm } from "@/components/PropertyForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  ChevronDown,
  ChevronRight,
  Download,
  Upload,
  Building2,
  Wallet,
  TrendingUp,
  PiggyBank,
  Database,
} from "lucide-react";

export default function Dashboard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Property | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/properties");
      return res.json();
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/properties"] });

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
    toast({ title: "Sample properties loaded" });
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
              <div className="text-base font-semibold tracking-tight">RentDeck</div>
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
            <Button size="sm" onClick={openAdd} data-testid="button-add" className="px-2.5 sm:px-3">
              <Plus size={16} className="sm:mr-1.5" />
              <span className="hidden sm:inline">Add property</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
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
          <Kpi label="Total equity" value={currency(portfolio.equity, { compact: true })} icon={<PiggyBank size={16} />} />
          <Kpi
            label="Avg cap rate"
            value={percent(portfolio.avgCapRate)}
            sub={`CoC ${percent(portfolio.avgCashOnCash)}`}
          />
        </div>

        {/* Chart */}
        {properties.length > 0 && (
          <Card className="mt-6 p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Monthly cash flow by property</h2>
                <p className="text-xs text-muted-foreground">Net monthly after all expenses and mortgage</p>
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
                    angle={-20}
                    textAnchor="end"
                    height={56}
                    tickFormatter={(v: string) => (v.length > 14 ? v.slice(0, 13) + "…" : v)}
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
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="w-8 px-3 py-2.5" />
                    <th className="px-3 py-2.5 font-medium">Property</th>
                    <th className="px-3 py-2.5 text-right font-medium">Rent</th>
                    <th className="px-3 py-2.5 text-right font-medium">Expenses</th>
                    <th className="px-3 py-2.5 text-right font-medium">Cash flow</th>
                    <th className="px-3 py-2.5 text-right font-medium">Value</th>
                    <th className="px-3 py-2.5 text-right font-medium">Equity</th>
                    <th className="px-3 py-2.5 text-right font-medium">Cap rate</th>
                    <th className="px-3 py-2.5 text-right font-medium">CoC</th>
                    <th className="px-3 py-2.5 text-right font-medium">ROI</th>
                    <th className="w-10 px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {properties.map((p) => {
                    const m = computeMetrics(p);
                    const open = expanded === p.id;
                    return (
                      <Fragment key={p.id}>
                        <tr className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-3 py-2.5">
                            <button
                              onClick={() => setExpanded(open ? null : p.id)}
                              className="text-muted-foreground hover:text-foreground"
                              aria-label={open ? "Collapse" : "Expand"}
                              data-testid={`button-expand-${p.id}`}
                            >
                              {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-medium">{p.name}</div>
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
                          <td className="num px-3 py-2.5 text-right">{currency(m.equity)}</td>
                          <td className="num px-3 py-2.5 text-right">{percent(m.capRate)}</td>
                          <td className={`num px-3 py-2.5 text-right ${m.cashOnCash >= 0 ? "text-success" : "text-destructive"}`}>{percent(m.cashOnCash)}</td>
                          <td className="num px-3 py-2.5 text-right text-muted-foreground">{percent(m.roi)}</td>
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
                                <DropdownMenuItem onClick={() => setExpanded(open ? null : p.id)}>
                                  {open ? <ChevronDown size={14} className="mr-2" /> : <ChevronRight size={14} className="mr-2" />}
                                  {open ? "Hide details" : "View details"}
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
                        {open && (
                          <tr className="bg-muted/20">
                            <td />
                            <td colSpan={10} className="px-3 py-4">
                              <DetailPanel p={p} m={m} />
                            </td>
                          </tr>
                        )}
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

function DetailPanel({ p, m }: { p: Property; m: ReturnType<typeof computeMetrics> }) {
  const lines = [
    { label: "Property type", value: p.propertyType },
    { label: "Purchased", value: `${formatDate(p.purchaseDate)} · ${currency(p.purchasePrice)}` },
    { label: "Current value", value: currency(p.currentValue) },
    { label: "Appreciation", value: signedCurrency(m.appreciation), tone: m.appreciation >= 0 ? "pos" : "neg" },
    { label: "Loan balance", value: currency(p.loanBalance) },
    { label: "Interest rate", value: `${p.interestRate}%` },
    { label: "Equity", value: currency(m.equity) },
    { label: "Monthly mortgage", value: currency(p.mortgagePayment) },
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
    { label: "Cap rate", value: percent(m.capRate) },
    { label: "Cash-on-cash", value: percent(m.cashOnCash), tone: m.cashOnCash >= 0 ? "pos" : "neg" },
    { label: "ROI (on equity)", value: percent(m.roi) },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-4">
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
      {p.notes && (
        <div className="lg:col-span-4 rounded-md border bg-background p-3 text-sm">
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
