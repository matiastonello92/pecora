export const PERMISSIONS = {
  flags: [
    'flags:create',
    'flags:delete',
    'flags:edit',
    'flags:manage',
    'flags:view',
  ],
  suppliers: [
    'suppliers:view',
  ],
  incidents: [
    'incidents:view',
  ],
  inventory: [
    'inventory:create',
    'inventory:edit',
    'inventory:view',
  ],
  locations: [
    'locations:create',
    'locations:delete',
    'locations:edit',
    'locations:manage_flags',
    'locations:manage_permissions',
    'locations:manage_users',
    'locations:view',
  ],
  orders: [
    'orders:approve',
    'orders:create',
    'orders:edit',
    'orders:send_order',
    'orders:view',
  ],
  tasks: [
    'tasks:create',
    'tasks:edit',
    'tasks:view',
  ],
  technicians: [
    'technicians:view',
  ],
  users: [
    'users:create',
    'users:delete',
    'users:edit',
    'users:manage',
    'users:view',
  ],
} as const;

export type Module = keyof typeof PERMISSIONS;
export type Permission =
  | (typeof PERMISSIONS)[Module][number]
  | `${Module}:*`
  | '*';
export const assertPermission = <P extends Permission>(p: P) => p;
