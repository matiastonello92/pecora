-- 002_location_scoped_permissions.sql

-- Aggiungi scoping di location a user_roles (NULL = ruolo valido per TUTTE le location dell'org)
ALTER TABLE IF EXISTS public.user_roles
  ADD COLUMN IF NOT EXISTS location_id uuid NULL REFERENCES public.locations(id);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_org_loc
  ON public.user_roles(user_id, org_id, location_id);

-- Aggiungi scoping di location agli override (NULL = override valido per TUTTE le location dell'org)
ALTER TABLE IF EXISTS public.user_permission_overrides
  ADD COLUMN IF NOT EXISTS location_id uuid NULL REFERENCES public.locations(id);

CREATE INDEX IF NOT EXISTS idx_user_perm_overrides_user_org_loc
  ON public.user_permission_overrides(user_id, org_id, location_id);

-- Funzione SQL per calcolare i permessi effettivi con scoping org/location
CREATE OR REPLACE FUNCTION app.get_effective_permissions(p_user uuid, p_org uuid, p_location uuid)
RETURNS TABLE(permission text)
LANGUAGE sql
STABLE
AS $$
  WITH role_codes AS (
    SELECT DISTINCT p.code
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id AND r.org_id = ur.org_id
    JOIN public.role_permissions rp ON rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = p_user
      AND ur.org_id = p_org
      AND (ur.location_id IS NULL OR ur.location_id = p_location)
  ),
  apply_overrides AS (
    SELECT rc.code AS permission, TRUE AS allowed
    FROM role_codes rc
    UNION ALL
    SELECT p.code, upo.allow AS allowed
    FROM public.user_permission_overrides upo
    JOIN public.permissions p ON p.id = upo.permission_id
    WHERE upo.user_id = p_user
      AND upo.org_id = p_org
      AND (upo.location_id IS NULL OR upo.location_id = p_location)
  ),
  resolved AS (
    -- regola: se esiste almeno un allow=true → permesso concesso; un deny (allow=false) lo rimuove
    SELECT permission,
           BOOL_OR(allowed) FILTER (WHERE allowed = TRUE) AS any_allow,
           BOOL_OR(NOT allowed) FILTER (WHERE allowed = FALSE) AS any_deny
    FROM apply_overrides
    GROUP BY permission
  )
  SELECT permission
  FROM resolved
  WHERE (any_allow = TRUE AND any_deny = FALSE)
     OR (any_allow = TRUE AND any_deny IS NULL)
     OR (any_allow IS NULL AND any_deny = FALSE);
$$;

-- Opzionale: assicurati che il chiamante “normale” possa usare la funzione.
REVOKE ALL ON FUNCTION app.get_effective_permissions(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.get_effective_permissions(uuid, uuid, uuid) TO anon, authenticated;
