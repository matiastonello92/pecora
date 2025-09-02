export const modules = [
  'flags',
  'suppliers',
  'incidents',
  'inventory',
  'locations',
  'orders',
  'tasks',
  'technicians',
  'users',
] as const;

export const actions = [
  'view',
  'create',
  'edit',
  'delete',
  'manage',
  'manage_users',
  'manage_permissions',
  'manage_flags',
  'send_order',
  'approve',
] as const;

export type Module = typeof modules[number];
export type Action = typeof actions[number];

export type Permission =
  | `${Module}.${Action}`
  | `${Module}:*`
  | '*'
  | (string & {});

export const registry = { modules, actions } as const;
