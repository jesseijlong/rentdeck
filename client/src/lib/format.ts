export function currency(n: number, opts?: { compact?: boolean; cents?: boolean }) {
  if (!isFinite(n)) n = 0;
  const abs = Math.abs(n);
  if (opts?.compact && abs >= 1000) {
    const sign = n < 0 ? "-" : "";
    if (abs >= 1_000_000)
      return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2)}M`;
    if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(abs >= 100_000 ? 0 : 1)}k`;
  }
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: opts?.cents ? 2 : 0,
    maximumFractionDigits: opts?.cents ? 2 : 0,
  });
}

export function percent(n: number, digits = 1) {
  if (!isFinite(n)) n = 0;
  return `${(n * 100).toFixed(digits)}%`;
}

export function signedCurrency(n: number, opts?: { compact?: boolean }) {
  const s = currency(Math.abs(n), opts);
  return n < 0 ? `-${s}` : s;
}

export function formatDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
