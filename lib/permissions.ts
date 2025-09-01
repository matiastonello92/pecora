export type Permission = string;

export function can(perms: Permission[] | undefined, needed: Permission | Permission[]): boolean {
  if (!perms?.length) return false;
  const need = Array.isArray(needed) ? needed : [needed];
  return need.every(n => perms.includes(n) || perms.includes("*") || perms.includes(n.split(":")[0] + ":*"));
}

export async function getUserPermissions(orgId?: string, locationId?: string): Promise<string[]> {
  const qs = new URLSearchParams();
  if (orgId) qs.set("orgId", orgId);
  if (locationId) qs.set("locationId", locationId);
  const res = await fetch(`/api/v1/me/permissions?${qs.toString()}`, { credentials: "include" });
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json?.permissions) ? json.permissions : [];
}
