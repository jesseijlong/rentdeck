import type { Property } from "@shared/schema";

export interface LeaseStatus {
  property: Property;
  daysLeft: number | null; // null if no lease end set
  expired: boolean;
  expiringSoon: boolean; // within window and not expired
}

const WARNING_WINDOW_DAYS = 60;

export function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / 86400000);
}

export function getLeaseStatus(property: Property): LeaseStatus {
  const daysLeft = daysUntil(property.leaseEnd);
  const expired = daysLeft !== null && daysLeft < 0;
  const expiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= WARNING_WINDOW_DAYS;
  return { property, daysLeft, expired, expiringSoon };
}

export function getLeaseAlerts(properties: Property[]): LeaseStatus[] {
  return properties
    .map(getLeaseStatus)
    .filter((s) => s.expired || s.expiringSoon)
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
}

export function formatDaysLeft(daysLeft: number | null): string {
  if (daysLeft === null) return "No lease end set";
  if (daysLeft < 0) return `Expired ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} ago`;
  if (daysLeft === 0) return "Expires today";
  return `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`;
}
