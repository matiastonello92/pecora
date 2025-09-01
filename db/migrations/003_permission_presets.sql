-- 003_permission_presets.sql
-- Add permission preset tables with RLS

-- =====================================================
-- 1. TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.permission_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.permission_preset_items (
    preset_id UUID NOT NULL REFERENCES public.permission_presets(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    allow BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (preset_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.role_permission_presets (
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    preset_id UUID NOT NULL REFERENCES public.permission_presets(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, preset_id)
);

-- =====================================================
-- 2. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.permission_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_preset_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permission_presets ENABLE ROW LEVEL SECURITY;

-- Authenticated read
DROP POLICY IF EXISTS "Authenticated users can view permission presets" ON public.permission_presets;
CREATE POLICY "Authenticated users can view permission presets" ON public.permission_presets
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can view permission preset items" ON public.permission_preset_items;
CREATE POLICY "Authenticated users can view permission preset items" ON public.permission_preset_items
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can view role permission presets" ON public.role_permission_presets;
CREATE POLICY "Authenticated users can view role permission presets" ON public.role_permission_presets
  FOR SELECT USING (auth.role() = 'authenticated');

-- Admin manage
DROP POLICY IF EXISTS "Admins can manage permission presets" ON public.permission_presets;
CREATE POLICY "Admins can manage permission presets" ON public.permission_presets
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.name = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.name = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage permission preset items" ON public.permission_preset_items;
CREATE POLICY "Admins can manage permission preset items" ON public.permission_preset_items
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.name = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.name = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage role permission presets" ON public.role_permission_presets;
CREATE POLICY "Admins can manage role permission presets" ON public.role_permission_presets
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.name = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.name = 'admin'
    )
  );

-- =====================================================
-- 3. TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_permission_presets_updated_at ON public.permission_presets;
CREATE TRIGGER update_permission_presets_updated_at
  BEFORE UPDATE ON public.permission_presets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Permission presets migration 003 completed';
END $$;
