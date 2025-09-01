import { supabaseAdmin } from './supabase/server'

type MaybeArray<T> = T | T[] | null | undefined;

function asArray<T>(v: MaybeArray<T>): T[] {
  return v == null ? [] : Array.isArray(v) ? v : [v];
}

// Tipi minimi per evitare any
type RolePermissionRow = { permissions?: { code?: string | null } | null } | null;
type RoleRow = { role_permissions?: MaybeArray<RolePermissionRow> } | null;
type UserRoleRow = { roles?: MaybeArray<RoleRow> } | null;
type OverrideRow = { allow?: boolean | null; permissions?: MaybeArray<{ code?: string | null }> } | null;

// Cache interface
interface PermissionCacheEntry {
  permissions: Set<string>
  timestamp: number
}

// In-memory cache with 60s TTL
const permissionCache = new Map<string, PermissionCacheEntry>()
const CACHE_TTL = 60 * 1000 // 60 seconds

/**
 * Clear expired cache entries
 */
function clearExpiredCache() {
  const now = Date.now()
  for (const [key, entry] of permissionCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      permissionCache.delete(key)
    }
  }
}

/**
 * Generate cache key for user permissions
 */
function getCacheKey(user_id: string, org_id: string, location_id?: string): string {
  return `${user_id}:${org_id}:${location_id || 'global'}`
}

/**
 * Calculate effective permissions for a user in an org/location context
 * Combines role-based permissions with user-specific overrides
 */
async function calculateEffectivePermissions(
  user_id: string,
  org_id: string,
  _location_id?: string
): Promise<Set<string>> {
  void _location_id
  try {
    // Query 1: Get permissions from user's roles in this org
    const { data: rolePermissions, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select(`
        role_id,
        roles!inner(
          id,
          org_id,
          role_permissions!inner(
            permission_id,
            permissions!inner(
              code
            )
          )
        )
      `)
      .eq('user_id', user_id)
      .eq('org_id', org_id)

    if (roleError) {
      console.error('Error fetching role permissions:', roleError)
      return new Set()
    }

    // Extract permission codes from roles
    const rolePermissionCodes = new Set<string>();
    asArray<UserRoleRow>(rolePermissions as MaybeArray<UserRoleRow>).forEach(userRole => {
      asArray<RoleRow>(userRole?.roles).forEach(role => {
        asArray<RolePermissionRow>(role?.role_permissions).forEach(rp => {
          const code = rp?.permissions?.code ?? undefined;
          if (code) rolePermissionCodes.add(code);
        });
      });
    });

    // Query 2: Get user-specific permission overrides
    const { data: overrides, error: overrideError } = await supabaseAdmin
      .from('user_permission_overrides')
      .select(`
        allow,
        permissions!inner(
          code
        )
      `)
      .eq('user_id', user_id)
      .eq('org_id', org_id)

    if (overrideError) {
      console.error('Error fetching permission overrides:', overrideError)
      // Continue with role permissions only
    }

    // Apply overrides to role permissions
    asArray<OverrideRow>(overrides as MaybeArray<OverrideRow>).forEach(override => {
      asArray<{ code?: string | null }>(override?.permissions).forEach(p => {
        const code = p?.code ?? undefined;
        if (!code) return;
        if (override?.allow) {
          // Grant permission (add to set)
          rolePermissionCodes.add(code);
        } else {
          // Deny permission (remove from set)
          rolePermissionCodes.delete(code);
        }
      });
    });

    return rolePermissionCodes

  } catch (error) {
    console.error('Error calculating effective permissions:', error)
    return new Set()
  }
}

/**
 * Check if a user has a specific permission in the given context
 * Uses in-memory cache with 60s TTL to reduce database queries
 * 
 * @param user_id - UUID of the user
 * @param permission_code - Permission code in format "module.action" (e.g., "users.manage")
 * @param context - Organization and optional location context
 * @returns Promise<boolean> - true if user has permission, false otherwise
 */
export async function can(
  user_id: string,
  permission_code: string,
  context: { org_id: string; location_id?: string }
): Promise<boolean> {
  try {
    // Clear expired cache entries periodically
    clearExpiredCache()

    const cacheKey = getCacheKey(user_id, context.org_id, context.location_id)
    const now = Date.now()

    // Check cache first
    const cached = permissionCache.get(cacheKey)
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      return cached.permissions.has(permission_code)
    }

    // Calculate effective permissions
    const effectivePermissions = await calculateEffectivePermissions(
      user_id,
      context.org_id,
      context.location_id
    )

    // Cache the result
    permissionCache.set(cacheKey, {
      permissions: effectivePermissions,
      timestamp: now
    })

    // Return permission check result
    return effectivePermissions.has(permission_code)

  } catch (error) {
    console.error('Error in can() permission check:', error)
    // Fail closed - deny permission on error
    return false
  }
}

/**
 * Check multiple permissions at once
 * More efficient than calling can() multiple times
 */
export async function canMultiple(
  user_id: string,
  permission_codes: string[],
  context: { org_id: string; location_id?: string }
): Promise<Record<string, boolean>> {
  try {
    clearExpiredCache()

    const cacheKey = getCacheKey(user_id, context.org_id, context.location_id)
    const now = Date.now()

    // Check cache first
    let effectivePermissions: Set<string>
    const cached = permissionCache.get(cacheKey)
    
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      effectivePermissions = cached.permissions
    } else {
      // Calculate effective permissions
      effectivePermissions = await calculateEffectivePermissions(
        user_id,
        context.org_id,
        context.location_id
      )

      // Cache the result
      permissionCache.set(cacheKey, {
        permissions: effectivePermissions,
        timestamp: now
      })
    }

    // Build result object
    const result: Record<string, boolean> = {}
    permission_codes.forEach(code => {
      result[code] = effectivePermissions.has(code)
    })

    return result

  } catch (error) {
    console.error('Error in canMultiple() permission check:', error)
    // Fail closed - deny all permissions on error
    const result: Record<string, boolean> = {}
    permission_codes.forEach(code => {
      result[code] = false
    })
    return result
  }
}

/**
 * Invalidate cache for a specific user/context
 * Call this after role or permission changes
 */
export function invalidatePermissionCache(
  user_id: string,
  org_id: string,
  location_id?: string
): void {
  const cacheKey = getCacheKey(user_id, org_id, location_id)
  permissionCache.delete(cacheKey)
}

/**
 * Clear all permission cache
 * Call this for global permission changes
 */
export function clearPermissionCache(): void {
  permissionCache.clear()
}

/**
 * Get cache statistics for monitoring
 */
export function getPermissionCacheStats() {
  clearExpiredCache()
  return {
    size: permissionCache.size,
    entries: Array.from(permissionCache.keys())
  }
}

// Example usage in UI components:
/*
// In a React component or API route:
const hasUserManagement = await can(userId, 'users.manage', { org_id, location_id })
const hasFeatureFlagAccess = await can(userId, 'flags.view', { org_id, location_id })

// For multiple permissions:
const permissions = await canMultiple(userId, [
  'users.manage',
  'flags.view',
  'admin.manage'
], { org_id, location_id })

// In UI:
{permissions['users.manage'] && (
  <Button>Manage Users</Button>
)}

// After role changes:
invalidatePermissionCache(userId, org_id, location_id)
*/
