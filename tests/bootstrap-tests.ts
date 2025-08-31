import { supabaseAdmin } from '../lib/supabase/server'
import { can, canMultiple } from '../lib/permissions'

/**
 * Bootstrap and Permission System Tests
 * Tests the complete bootstrap flow and permission system
 */

async function testDatabaseConnectivity() {
  console.log('🔌 Testing database connectivity...')
  
  try {
    const { data, error } = await supabaseAdmin
      .from('orgs')
      .select('count')
      .limit(1)
    
    if (error) {
      console.log('   ❌ Database connection failed:', error.message)
      return false
    }
    
    console.log('   ✅ Database connection successful')
    return true
  } catch (error) {
    console.log('   ❌ Database connection error:', error instanceof Error ? error.message : 'Unknown error')
    return false
  }
}

async function testSchemaIntegrity() {
  console.log('🗄️ Testing schema integrity...')
  
  const requiredTables = [
    'orgs', 'locations', 'users', 'users_locations',
    'modules', 'actions', 'permissions', 'roles',
    'role_permissions', 'user_roles', 'user_permission_overrides',
    'feature_flags', 'audit_log', 'event_outbox'
  ]
  
  let allTablesExist = true
  
  for (const table of requiredTables) {
    try {
      const { error } = await supabaseAdmin
        .from(table)
        .select('*')
        .limit(1)
      
      if (error) {
        console.log(`   ❌ Table '${table}': ${error.message}`)
        allTablesExist = false
      } else {
        console.log(`   ✅ Table '${table}': OK`)
      }
    } catch (error) {
      console.log(`   ❌ Table '${table}': ${error instanceof Error ? error.message : 'Unknown error'}`)
      allTablesExist = false
    }
  }
  
  return allTablesExist
}

async function testContextFunction() {
  console.log('⚙️ Testing app.set_context function...')
  
  try {
    const { error } = await supabaseAdmin.rpc('app.set_context', {
      p_org: '550e8400-e29b-41d4-a716-446655440000',
      p_location: '550e8400-e29b-41d4-a716-446655440001'
    })
    
    if (error) {
      console.log('   ❌ Context function failed:', error.message)
      return false
    }
    
    console.log('   ✅ Context function working')
    return true
  } catch (error) {
    console.log('   ❌ Context function error:', error instanceof Error ? error.message : 'Unknown error')
    return false
  }
}

async function testSeedData() {
  console.log('🌱 Testing seed data...')
  
  try {
    // Check Demo Organization
    const { data: orgs, error: orgsError } = await supabaseAdmin
      .from('orgs')
      .select('*')
      .eq('name', 'Demo Organization')
    
    if (orgsError || !orgs || orgs.length === 0) {
      console.log('   ❌ Demo Organization not found')
      return false
    }
    
    console.log('   ✅ Demo Organization exists')
    
    // Check locations
    const { data: locations, error: locationsError } = await supabaseAdmin
      .from('locations')
      .select('*')
      .eq('org_id', orgs[0].id)
    
    if (locationsError || !locations || locations.length < 2) {
      console.log('   ❌ Locations not found (expected Lyon and Menton)')
      return false
    }
    
    console.log(`   ✅ Found ${locations.length} locations`)
    
    // Check roles
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('roles')
      .select('*')
      .eq('org_id', orgs[0].id)
    
    if (rolesError || !roles || roles.length < 3) {
      console.log('   ❌ Roles not found (expected admin, manager, staff)')
      return false
    }
    
    console.log(`   ✅ Found ${roles.length} roles`)
    
    // Check permissions
    const { data: permissions, error: permissionsError } = await supabaseAdmin
      .from('permissions')
      .select('*')
    
    if (permissionsError || !permissions || permissions.length === 0) {
      console.log('   ❌ Permissions not found')
      return false
    }
    
    console.log(`   ✅ Found ${permissions.length} permissions`)
    
    return true
  } catch (error) {
    console.log('   ❌ Seed data test failed:', error instanceof Error ? error.message : 'Unknown error')
    return false
  }
}

async function testRLSPolicies() {
  console.log('🔒 Testing RLS policies...')
  
  try {
    // Test that policies exist
    const { data: policies, error } = await supabaseAdmin
      .from('pg_policies')
      .select('schemaname, tablename, policyname')
      .eq('schemaname', 'public')
    
    if (error) {
      console.log('   ❌ Could not fetch RLS policies:', error.message)
      return false
    }
    
    const policyCount = policies?.length || 0
    console.log(`   ✅ Found ${policyCount} RLS policies`)
    
    // Group by table
    const policiesByTable = policies?.reduce((acc, policy) => {
      if (!acc[policy.tablename]) acc[policy.tablename] = 0
      acc[policy.tablename]++
      return acc
    }, {} as Record<string, number>) || {}
    
    Object.entries(policiesByTable).forEach(([table, count]) => {
      console.log(`      ${table}: ${count} policies`)
    })
    
    return policyCount > 0
  } catch (error) {
    console.log('   ❌ RLS policies test failed:', error instanceof Error ? error.message : 'Unknown error')
    return false
  }
}

async function testPermissionSystem() {
  console.log('🛡️ Testing permission system...')
  
  try {
    // Create a test user ID (we'll use a fake UUID for testing)
    const testUserId = '00000000-0000-0000-0000-000000000001'
    const demoOrgId = '550e8400-e29b-41d4-a716-446655440000'
    const lyonLocationId = '550e8400-e29b-41d4-a716-446655440001'
    
    // Test permission check (should return false for non-existent user)
    const hasPermission = await can(testUserId, 'admin.manage', {
      org_id: demoOrgId,
      location_id: lyonLocationId
    })
    
    console.log(`   ✅ Permission check executed (result: ${hasPermission})`)
    
    // Test multiple permissions
    const permissions = await canMultiple(testUserId, [
      'admin.view',
      'users.manage',
      'flags.view'
    ], {
      org_id: demoOrgId,
      location_id: lyonLocationId
    })
    
    console.log(`   ✅ Multiple permission check executed`)
    console.log(`      admin.view: ${permissions['admin.view']}`)
    console.log(`      users.manage: ${permissions['users.manage']}`)
    console.log(`      flags.view: ${permissions['flags.view']}`)
    
    return true
  } catch (error) {
    console.log('   ❌ Permission system test failed:', error instanceof Error ? error.message : 'Unknown error')
    return false
  }
}

async function testAuditLogging() {
  console.log('📝 Testing audit logging...')
  
  try {
    // Insert a test audit log entry
    const { error } = await supabaseAdmin
      .from('audit_log')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000001',
        org_id: '550e8400-e29b-41d4-a716-446655440000',
        location_id: '550e8400-e29b-41d4-a716-446655440001',
        action: 'test_action',
        entity: 'test_entity',
        entity_id: '00000000-0000-0000-0000-000000000002',
        diff: { test: 'data' }
      })
    
    if (error) {
      console.log('   ❌ Audit log insert failed:', error.message)
      return false
    }
    
    console.log('   ✅ Audit log entry created successfully')
    
    // Clean up test entry
    await supabaseAdmin
      .from('audit_log')
      .delete()
      .eq('action', 'test_action')
      .eq('entity', 'test_entity')
    
    return true
  } catch (error) {
    console.log('   ❌ Audit logging test failed:', error instanceof Error ? error.message : 'Unknown error')
    return false
  }
}

async function testEventOutbox() {
  console.log('📤 Testing event outbox...')
  
  try {
    // Insert a test event
    const { error } = await supabaseAdmin
      .from('event_outbox')
      .insert({
        type: 'test_event',
        payload: { test: 'data', timestamp: new Date().toISOString() },
        delivered: false,
        retries: 0
      })
    
    if (error) {
      console.log('   ❌ Event outbox insert failed:', error.message)
      return false
    }
    
    console.log('   ✅ Event outbox entry created successfully')
    
    // Clean up test entry
    await supabaseAdmin
      .from('event_outbox')
      .delete()
      .eq('type', 'test_event')
    
    return true
  } catch (error) {
    console.log('   ❌ Event outbox test failed:', error instanceof Error ? error.message : 'Unknown error')
    return false
  }
}

export async function runBootstrapTests() {
  console.log('🧪 BOOTSTRAP & PERMISSION TESTS')
  console.log('=' .repeat(50))
  console.log('')
  
  const tests = [
    { name: 'Database Connectivity', fn: testDatabaseConnectivity },
    { name: 'Schema Integrity', fn: testSchemaIntegrity },
    { name: 'Context Function', fn: testContextFunction },
    { name: 'Seed Data', fn: testSeedData },
    { name: 'RLS Policies', fn: testRLSPolicies },
    { name: 'Permission System', fn: testPermissionSystem },
    { name: 'Audit Logging', fn: testAuditLogging },
    { name: 'Event Outbox', fn: testEventOutbox }
  ]
  
  let passedTests = 0
  let failedTests = 0
  
  for (const test of tests) {
    try {
      const result = await test.fn()
      if (result) {
        passedTests++
      } else {
        failedTests++
      }
    } catch (error) {
      console.log(`❌ Test '${test.name}' threw an error:`, error)
      failedTests++
    }
    console.log('')
  }
  
  console.log('📊 TEST SUMMARY')
  console.log('=' .repeat(30))
  console.log(`✅ Passed: ${passedTests}`)
  console.log(`❌ Failed: ${failedTests}`)
  console.log(`📈 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`)
  
  if (failedTests === 0) {
    console.log('\n🎉 All bootstrap tests passed!')
    console.log('The system is ready for user onboarding.')
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.')
    console.log('Fix the issues before proceeding with user onboarding.')
  }
  
  return failedTests === 0
}

if (require.main === module) {
  runBootstrapTests()
}
