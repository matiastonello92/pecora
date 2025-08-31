-- =====================================================
-- Staff Management System - Minimal Bootstrap Seed
-- Version: 001
-- Description: Minimal seed data for admin UI functionality
-- =====================================================

-- =====================================================
-- 1. DEMO ORGANIZATION & LOCATIONS
-- =====================================================

-- Insert Demo Organization
INSERT INTO orgs (id, name) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Demo Organization')
ON CONFLICT (id) DO NOTHING;

-- Insert Lyon location
INSERT INTO locations (id, org_id, name) 
VALUES (
    '550e8400-e29b-41d4-a716-446655440001', 
    '550e8400-e29b-41d4-a716-446655440000', 
    'Lyon'
) ON CONFLICT (id) DO NOTHING;

-- Insert Menton location
INSERT INTO locations (id, org_id, name) 
VALUES (
    '550e8400-e29b-41d4-a716-446655440002', 
    '550e8400-e29b-41d4-a716-446655440000', 
    'Menton'
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. MINIMAL MODULES & ACTIONS FOR ADMIN UI
-- =====================================================

-- Core modules needed for admin functionality
INSERT INTO modules (id, code, name) VALUES
    ('10000000-0000-0000-0000-000000000001', 'admin', 'Administration'),
    ('10000000-0000-0000-0000-000000000002', 'users', 'User Management'),
    ('10000000-0000-0000-0000-000000000003', 'flags', 'Feature Flags')
ON CONFLICT (code) DO NOTHING;

-- Core actions needed for admin functionality
INSERT INTO actions (id, code, name) VALUES
    ('20000000-0000-0000-0000-000000000001', 'view', 'View'),
    ('20000000-0000-0000-0000-000000000002', 'manage', 'Manage'),
    ('20000000-0000-0000-0000-000000000003', 'create', 'Create'),
    ('20000000-0000-0000-0000-000000000004', 'edit', 'Edit'),
    ('20000000-0000-0000-0000-000000000005', 'delete', 'Delete')
ON CONFLICT (code) DO NOTHING;

-- Create permissions for admin UI
INSERT INTO permissions (id, module_id, action_id, code) VALUES
    -- Admin permissions
    ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'admin.view'),
    ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'admin.manage'),
    
    -- User management permissions
    ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'users.view'),
    ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'users.manage'),
    ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003', 'users.create'),
    ('30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004', 'users.edit'),
    ('30000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000005', 'users.delete'),
    
    -- Feature flags permissions
    ('30000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'flags.view'),
    ('30000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'flags.manage'),
    ('30000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'flags.create'),
    ('30000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000004', 'flags.edit'),
    ('30000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000005', 'flags.delete')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 3. BASE ROLES FOR DEMO ORGANIZATION
-- =====================================================

-- Admin role (full access)
INSERT INTO roles (id, org_id, code, name) VALUES
    ('40000000-0000-0000-0000-000000000001', '550e8400-e29b-41d4-a716-446655440000', 'admin', 'Administrator')
ON CONFLICT (org_id, code) DO NOTHING;

-- Manager role (limited access)
INSERT INTO roles (id, org_id, code, name) VALUES
    ('40000000-0000-0000-0000-000000000002', '550e8400-e29b-41d4-a716-446655440000', 'manager', 'Manager')
ON CONFLICT (org_id, code) DO NOTHING;

-- Staff role (basic access)
INSERT INTO roles (id, org_id, code, name) VALUES
    ('40000000-0000-0000-0000-000000000003', '550e8400-e29b-41d4-a716-446655440000', 'staff', 'Staff')
ON CONFLICT (org_id, code) DO NOTHING;

-- =====================================================
-- 4. ROLE PERMISSIONS ASSIGNMENT
-- =====================================================

-- Admin role gets all permissions
INSERT INTO role_permissions (role_id, permission_id) VALUES
    -- Admin permissions
    ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001'), -- admin.view
    ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002'), -- admin.manage
    
    -- User management permissions
    ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003'), -- users.view
    ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004'), -- users.manage
    ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005'), -- users.create
    ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000006'), -- users.edit
    ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000007'), -- users.delete
    
    -- Feature flags permissions
    ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000008'), -- flags.view
    ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000009'), -- flags.manage
    ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000010'), -- flags.create
    ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000011'), -- flags.edit
    ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000012')  -- flags.delete
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager role gets view and manage permissions (no delete)
INSERT INTO role_permissions (role_id, permission_id) VALUES
    -- Admin view only
    ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001'), -- admin.view
    
    -- User management (no delete)
    ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003'), -- users.view
    ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000005'), -- users.create
    ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000006'), -- users.edit
    
    -- Feature flags view only
    ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000008')  -- flags.view
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Staff role gets basic view permissions only
INSERT INTO role_permissions (role_id, permission_id) VALUES
    -- Basic admin view
    ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001'), -- admin.view
    
    -- Users view only
    ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003')  -- users.view
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- =====================================================
-- 5. SAMPLE FEATURE FLAGS
-- =====================================================

-- Global feature flags
INSERT INTO feature_flags (id, org_id, location_id, module_code, flag_code, enabled) VALUES
    ('50000000-0000-0000-0000-000000000001', '550e8400-e29b-41d4-a716-446655440000', NULL, 'admin', 'advanced_permissions', true),
    ('50000000-0000-0000-0000-000000000002', '550e8400-e29b-41d4-a716-446655440000', NULL, 'users', 'bulk_operations', false)
ON CONFLICT (id) DO NOTHING;

-- Location-specific feature flags
INSERT INTO feature_flags (id, org_id, location_id, module_code, flag_code, enabled) VALUES
    -- Lyon specific
    ('50000000-0000-0000-0000-000000000003', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'admin', 'debug_mode', true),
    
    -- Menton specific
    ('50000000-0000-0000-0000-000000000004', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', 'admin', 'debug_mode', false)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SEED COMPLETE
-- =====================================================

-- Log seed completion
DO $$
BEGIN
    RAISE NOTICE 'Minimal bootstrap seed 001 completed successfully';
    RAISE NOTICE 'Created Demo Organization with Lyon and Menton locations';
    RAISE NOTICE 'Created 3 modules: admin, users, flags';
    RAISE NOTICE 'Created 5 actions: view, manage, create, edit, delete';
    RAISE NOTICE 'Created 12 permissions for admin UI functionality';
    RAISE NOTICE 'Created 3 roles: admin (full), manager (limited), staff (basic)';
    RAISE NOTICE 'Created 4 sample feature flags';
    RAISE NOTICE 'Ready for bootstrap endpoint to assign user to admin role';
END $$;
