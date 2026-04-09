/** Values stored in `profiles.role` at signup (and normalized variants). */
export type LeadershipDashboardRole = "finance-manager" | "group-leader" | "unit-leader";

export const LEADERSHIP_ROLE_LABELS: Record<LeadershipDashboardRole, string> = {
  "finance-manager": "Finance Manager",
  "group-leader": "Group Leader",
  "unit-leader": "Unit Leader",
};

/** Maps DB / metadata role strings to dashboard keys. */
export function normalizeLeadershipRole(raw: string | null | undefined): LeadershipDashboardRole | null {
  if (!raw) return null;
  const n = raw
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  if (/^(finance|finance-manager|financemanager)$/.test(n)) return "finance-manager";
  if (/^(group-leader|groupleader)$/.test(n)) return "group-leader";
  if (/^(unit-leader|unitleader)$/.test(n)) return "unit-leader";

  if (n === "finance-manager" || n === "group-leader" || n === "unit-leader") {
    return n as LeadershipDashboardRole;
  }
  return null;
}

export function isGroupLeaderRole(role: LeadershipDashboardRole | null): boolean {
  return role === "group-leader";
}

export function formatLeadershipRole(role: LeadershipDashboardRole | null): string {
  return role ? LEADERSHIP_ROLE_LABELS[role] : "Role not assigned";
}
