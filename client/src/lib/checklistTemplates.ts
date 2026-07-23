export type ChecklistType = "new-tenant" | "monthly-visit";

export interface ChecklistItem {
  label: string;
  checked: boolean;
}

export const CHECKLIST_TEMPLATES: Record<
  ChecklistType,
  { title: string; items: string[] }
> = {
  "new-tenant": {
    title: "New Tenant Move-In Checklist",
    items: [
      "Lease agreement signed by all parties",
      "Security deposit collected and receipt issued",
      "First month's rent collected",
      "Copy of tenant ID and emergency contact on file",
      "Keys / fobs handed over (record count)",
      "Utilities transferred to tenant name (water, electric, gas)",
      "Move-in condition inspection completed with photos",
      "Smoke detectors and CO detectors tested",
      "HVAC filters changed and vents checked",
      "Appliances tested (stove, fridge, dishwasher, W/D)",
      "All locks/rekey completed if applicable",
      "Move-in walkthrough signed by tenant",
      "Tenant added to renter's insurance / proof received",
      "Welcome packet / building rules provided",
      "Contact info for maintenance requests shared",
    ],
  },
  "monthly-visit": {
    title: "Monthly Property Visit Checklist",
    items: [
      "Rent collected and posted for the month",
      "Exterior walk-around (roof, siding, gutters, downspouts)",
      "Yard and landscaping condition",
      "Trash and debris removed",
      "Smoke / CO detectors functioning",
      "HVAC unit inspected, filter checked",
      "Water heater inspected for leaks",
      "Plumbing under sinks and around toilets checked",
      "Electrical outlets and panels visually checked",
      "Doors, locks, and windows operate properly",
      "Common areas clean and lit (multi-unit)",
      "Pest activity inspected",
      "Safety hazards addressed",
      "Photos taken of any issues",
      "Follow-up work orders created as needed",
    ],
  },
};

export function templateItems(type: ChecklistType): ChecklistItem[] {
  return CHECKLIST_TEMPLATES[type].items.map((label) => ({
    label,
    checked: false,
  }));
}

export function checklistTitle(type: ChecklistType): string {
  return CHECKLIST_TEMPLATES[type].title;
}
