-- =====================================================
-- Staff Management System - Bootstrap Schema
-- Version: 001
-- Description: Multi-tenant org→location→users with RBAC/ABAC
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. MULTI-TENANCY TABLES
-- =====================================================

-- Organizations table
CREATE TABLE IF NOT EXISTS orgs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Locations table (belongs to org)
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users-Locations mapping (many-to-many)
CREATE TABLE IF NOT EXISTS users_locations (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, org_id, location_id)
);

-- =====================================================
-- 2. PERMISSIONS & ROLES TABLES
-- =====================================================

-- Modules table (schema only, no placeholder data)
CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL
);

-- Actions table (schema only, no placeholder data)
CREATE TABLE IF NOT EXISTS actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL
);

-- Permissions table (module + action combination)
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
    code TEXT UNIQUE NOT NULL -- format: module_code.action_code
);

-- Roles table (per organization)
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, code)
);

-- Role permissions mapping
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- User roles mapping
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, org_id, role_id)
);

-- User permission overrides
CREATE TABLE IF NOT EXISTS user_permission_overrides (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    allow BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, org_id, permission_id)
);

-- =====================================================
-- 3. GOVERNANCE TABLES
-- =====================================================

-- Feature flags table
CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE, -- nullable for global flags
    module_code TEXT NOT NULL,
    flag_code TEXT NOT NULL,
    enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES users(id),
    org_id UUID REFERENCES orgs(id),
    location_id UUID REFERENCES locations(id),
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id UUID,
    diff JSONB
);

-- Event outbox table
CREATE TABLE IF NOT EXISTS event_outbox (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    type TEXT NOT NULL,
    payload JSONB NOT NULL,
    delivered BOOLEAN DEFAULT FALSE,
    retries INTEGER DEFAULT 0
);

-- =====================================================
-- 4. INDICES FOR PERFORMANCE
-- =====================================================

-- Multi-tenancy indices
CREATE INDEX IF NOT EXISTS idx_locations_org_id ON locations(org_id);
CREATE INDEX IF NOT EXISTS idx_users_locations_org_location ON users_locations(org_id, location_id, created_at);
CREATE INDEX IF NOT EXISTS idx_users_locations_user ON users_locations(user_id);

-- RBAC indices
CREATE INDEX IF NOT EXISTS idx_roles_org_id ON roles(org_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_org ON user_roles(org_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_overrides_org ON user_permission_overrides(org_id, user_id);

-- Governance indices
CREATE INDEX IF NOT EXISTS idx_feature_flags_org_location ON feature_flags(org_id, location_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_org_location_time ON audit_log(org_id, location_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_event_outbox_delivered ON event_outbox(delivered, occurred_at);

-- =====================================================
-- 5. CONTEXT FUNCTION
-- =====================================================

-- Create app schema
CREATE SCHEMA IF NOT EXISTS app;

-- Context setting function
CREATE OR REPLACE FUNCTION app.set_context(p_org UUID, p_location UUID)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT set_config('app.org_id', COALESCE(p_org::text, ''), true);
  SELECT set_config('app.location_id', COALESCE(p_location::text, ''), true);
  SELECT set_config('app.user_id', COALESCE(auth.uid()::text, ''), true);
$$;

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS) - DENY BY DEFAULT
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_outbox ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. RLS POLICIES
-- =====================================================

-- ORGS: User can only see orgs they belong to
DROP POLICY IF EXISTS "Users can view their orgs" ON orgs;
CREATE POLICY "Users can view their orgs" ON orgs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users_locations ul 
      WHERE ul.user_id = auth.uid() 
      AND ul.org_id = orgs.id
    )
  );

-- LOCATIONS: Filtered by app.org_id context
DROP POLICY IF EXISTS "Users can view locations in their org" ON locations;
CREATE POLICY "Users can view locations in their org" ON locations
  FOR SELECT USING (
    org_id::text = current_setting('app.org_id', true)
    AND EXISTS (
      SELECT 1 FROM users_locations ul 
      WHERE ul.user_id = auth.uid() 
      AND ul.org_id = locations.org_id
    )
  );

-- USERS: Self-read only
DROP POLICY IF EXISTS "Users can view themselves" ON users;
CREATE POLICY "Users can view themselves" ON users
  FOR SELECT USING (id = auth.uid());

-- USERS_LOCATIONS: Filtered by context and user membership
DROP POLICY IF EXISTS "Users can view their location memberships" ON users_locations;
CREATE POLICY "Users can view their location memberships" ON users_locations
  FOR SELECT USING (
    org_id::text = current_setting('app.org_id', true)
    AND (
      current_setting('app.location_id', true) = '' 
      OR location_id::text = current_setting('app.location_id', true)
    )
    AND user_id = auth.uid()
  );

-- MODULES: Global read (no org filtering needed)
DROP POLICY IF EXISTS "Authenticated users can view modules" ON modules;
CREATE POLICY "Authenticated users can view modules" ON modules
  FOR SELECT USING (auth.role() = 'authenticated');

-- ACTIONS: Global read (no org filtering needed)
DROP POLICY IF EXISTS "Authenticated users can view actions" ON actions;
CREATE POLICY "Authenticated users can view actions" ON actions
  FOR SELECT USING (auth.role() = 'authenticated');

-- PERMISSIONS: Global read (no org filtering needed)
DROP POLICY IF EXISTS "Authenticated users can view permissions" ON permissions;
CREATE POLICY "Authenticated users can view permissions" ON permissions
  FOR SELECT USING (auth.role() = 'authenticated');

-- ROLES: Filtered by app.org_id
DROP POLICY IF EXISTS "Users can view roles in their org" ON roles;
CREATE POLICY "Users can view roles in their org" ON roles
  FOR SELECT USING (
    org_id::text = current_setting('app.org_id', true)
  );

-- ROLE_PERMISSIONS: Filtered by role's org
DROP POLICY IF EXISTS "Users can view role permissions in their org" ON role_permissions;
CREATE POLICY "Users can view role permissions in their org" ON role_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM roles r 
      WHERE r.id = role_permissions.role_id 
      AND r.org_id::text = current_setting('app.org_id', true)
    )
  );

-- USER_ROLES: Filtered by app.org_id
DROP POLICY IF EXISTS "Users can view user roles in their org" ON user_roles;
CREATE POLICY "Users can view user roles in their org" ON user_roles
  FOR SELECT USING (
    org_id::text = current_setting('app.org_id', true)
  );

-- USER_PERMISSION_OVERRIDES: Filtered by app.org_id
DROP POLICY IF EXISTS "Users can view permission overrides in their org" ON user_permission_overrides;
CREATE POLICY "Users can view permission overrides in their org" ON user_permission_overrides
  FOR SELECT USING (
    org_id::text = current_setting('app.org_id', true)
  );

-- FEATURE_FLAGS: Filtered by app.org_id and app.location_id
DROP POLICY IF EXISTS "Users can view feature flags in their context" ON feature_flags;
CREATE POLICY "Users can view feature flags in their context" ON feature_flags
  FOR SELECT USING (
    org_id::text = current_setting('app.org_id', true)
    AND (
      location_id IS NULL -- global flags
      OR location_id::text = current_setting('app.location_id', true)
    )
  );

-- AUDIT_LOG: Filtered by app.org_id and app.location_id
DROP POLICY IF EXISTS "Users can view audit log in their context" ON audit_log;
CREATE POLICY "Users can view audit log in their context" ON audit_log
  FOR SELECT USING (
    org_id::text = current_setting('app.org_id', true)
    AND (
      location_id IS NULL 
      OR location_id::text = current_setting('app.location_id', true)
    )
  );

-- EVENT_OUTBOX: Filtered by context (assuming payload contains org info)
DROP POLICY IF EXISTS "Service role can access event outbox" ON event_outbox;
CREATE POLICY "Service role can access event outbox" ON event_outbox
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 8. UPDATED_AT TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at
DROP TRIGGER IF EXISTS update_orgs_updated_at ON orgs;
CREATE TRIGGER update_orgs_updated_at 
    BEFORE UPDATE ON orgs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
CREATE TRIGGER update_locations_updated_at 
    BEFORE UPDATE ON locations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at 
    BEFORE UPDATE ON roles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_permission_overrides_updated_at ON user_permission_overrides;
CREATE TRIGGER update_user_permission_overrides_updated_at 
    BEFORE UPDATE ON user_permission_overrides 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_feature_flags_updated_at ON feature_flags;
CREATE TRIGGER update_feature_flags_updated_at 
    BEFORE UPDATE ON feature_flags 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Bootstrap schema migration 001 completed successfully';
    RAISE NOTICE 'Tables created: orgs, locations, users, users_locations';
    RAISE NOTICE 'RBAC tables: modules, actions, permissions, roles, role_permissions, user_roles, user_permission_overrides';
    RAISE NOTICE 'Governance tables: feature_flags, audit_log, event_outbox';
    RAISE NOTICE 'RLS enabled on all tables with deny-by-default policies';
    RAISE NOTICE 'Context function app.set_context() available';
END $$;
