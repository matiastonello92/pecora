import type { Permission } from './permissions/registry';
export type { Permission } from './permissions/registry';

export function can(perms: Permission[] | undefined, needed: Permission | Permission[]): boolean {
  if (!perms?.length) return false;
  const need = Array.isArray(needed) ? needed : [needed];
  return need.every(n =>
    perms.includes(n) ||
    perms.includes('*') ||
    perms.includes((n.split(':')[0] + ':*') as Permission)
  );
}

/**
 * Verifica combinazioni di permessi:
 * - anyOf: basta 1 permesso
 * - allOf: servono tutti
 * Se entrambi presenti: deve passare sia anyOf (almeno uno) sia allOf (tutti).
 */
export function canMultiple(
  perms: Permission[] | undefined,
  opts?: { anyOf?: Permission[]; allOf?: Permission[] }
): boolean {
  if (!perms || perms.length === 0) return false;
  const anyOk = !opts?.anyOf || opts.anyOf.some(p => can(perms, p));
  const allOk = !opts?.allOf || opts.allOf.every(p => can(perms, p));
  return anyOk && allOk;
}

export async function getUserPermissions(orgId?: string, locationId?: string): Promise<Permission[]> {
  const qs = new URLSearchParams();
  if (orgId) qs.set("orgId", orgId);
  if (locationId) qs.set("locationId", locationId);
  const res = await fetch(`/api/v1/me/permissions?${qs.toString()}`, { credentials: "include" });
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json?.permissions) ? json.permissions : [];
}
