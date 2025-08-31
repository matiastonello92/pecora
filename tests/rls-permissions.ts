import { supabaseAdmin } from '../lib/supabase/server'
import { can, getUserPermissions } from '../lib/permissions'

interface TestResult {
  name: string
  status: 'PASS' | 'FAIL'
  message: string
  duration: number
}

async function testRLSIsolation(): Promise<TestResult> {
  const start = Date.now()
  
  try {
    // Set context for Demo Organization
    await supabaseAdmin.rpc('app.set_context', {
      p_org: '550e8400-e29b-41d4-a716-446655440000',
      p_location: '550e8400-e29b-41d4-a716-446655440001'
    })
    
    // Test that we can only see orgs in our context
    const { data: orgs, error: orgsError } = await supabaseAdmin
      .from('orgs')
      .select('*')
    
    if (orgsError) {
      return {
        name: 'RLS Isolation Test',
        status: 'FAIL',
        message: `RLS test failed: ${orgsError.message}`,
        duration: Date.now() - start
      }
    }
    
    // Should only see the demo org
    if (!orgs || orgs.length !== 1 || orgs[0].id !== '550e8400-e29b-41d4-a716-446655440000') {
      return {
        name: 'RLS Isolation Test',
        status: 'FAIL',
        message: `Expected 1 org (demo), got ${orgs?.length || 0}`,
        duration: Date.now() - start
      }
    }
    
    // Test locations are filtered by org
    const { data: locations, error: locationsError } = await supabaseAdmin
      .from('locations')
      .select('*')
    
    if (locationsError) {
      return {
        name: 'RLS Isolation Test',
        status: 'FAIL',
        message: `Locations RLS test failed: ${locationsError.message}`,
        duration: Date.now() - start
      }
    }
    
    // Should see both Lyon and Menton
    if (!locations || locations.length !== 2) {
      return {
        name: 'RLS Isolation Test',
        status: 'FAIL',
        message: `Expected 2 locations, got ${locations?.length || 0}`,
        duration: Date.now() - start
      }
    }
    
    return {
      name: 'RLS Isolation Test',
      status: 'PASS',
      message: `RLS working correctly. Org isolation: ✓, Location filtering: ✓`,
      duration: Date.now() - start
    }
  } catch (error) {
    return {
      name: 'RLS Isolation Test',
      status: 'FAIL',
      message: `RLS test error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: Date.now() - start
    }
  }
}

async function testPermissionSystem(): Promise<TestResult> {
  const start = Date.now()
  
  try {
    // Test admin user permissions (should have all permissions)
    const adminUserId = '550e8400-e29b-41d4-a716-446655440100' // Mock admin user
    const context = {
      org_id: '550e8400-e29b-41d4-a716-446655440000',
      location_id: '550e8400-e29b-41d4-a716-446655440001'
    }
    
    // Test that admin can send orders
    const canSendOrder = await can(adminUserId, 'ordini.send_order', context)
    
    // Test that admin can manage users
    const canManageUsers = await can(adminUserId, 'locations.manage_users', context)
    
    // Test staff user permissions (should have limited permissions)
    const staffUserId = '550e8400-e29b-41d4-a716-446655440102' // Mock staff user
    
    // Staff should NOT be able to send orders
    const staffCanSendOrder = await can(staffUserId, 'ordini.send_order', context)
    
    // Staff should be able to create tasks
    const staffCanCreateTask = await can(staffUserId, 'task.create', context)
    
    // Validate results
    const issues = []
    
    if (!canSendOrder) {
      issues.push('Admin should be able to send orders')
    }
    
    if (!canManageUsers) {
      issues.push('Admin should be able to manage users')
    }
    
    if (staffCanSendOrder) {
      issues.push('Staff should NOT be able to send orders')
    }
    
    if (!staffCanCreateTask) {
      issues.push('Staff should be able to create tasks')
    }
    
    if (issues.length > 0) {
      return {
        name: 'Permission System Test',
        status: 'FAIL',
        message: `Permission issues: ${issues.join(', ')}`,
        duration: Date.now() - start
      }
    }
    
    return {
      name: 'Permission System Test',
      status: 'PASS',
      message: 'Permission system working correctly. Admin/Staff roles validated.',
      duration: Date.now() - start
    }
  } catch (error) {
    return {
      name: 'Permission System Test',
      status: 'FAIL',
      message: `Permission test error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: Date.now() - start
    }
  }
}

async function testAuditLogging(): Promise<TestResult> {
  const start = Date.now()
  
  try {
    // Insert a test audit log entry
    const testEntry = {
      user_id: '550e8400-e29b-41d4-a716-446655440100',
      org_id: '550e8400-e29b-41d4-a716-446655440000',
      location_id: '550e8400-e29b-41d4-a716-446655440001',
      action: 'test_action',
      entity: 'test_entity',
      entity_id: '550e8400-e29b-41d4-a716-446655440999',
      diff: { test: 'data', timestamp: new Date().toISOString() }
    }
    
    const { data, error } = await supabaseAdmin
      .from('audit_log')
      .insert(testEntry)
      .select()
    
    if (error) {
      return {
        name: 'Audit Logging Test',
        status: 'FAIL',
        message: `Audit log insert failed: ${error.message}`,
        duration: Date.now() - start
      }
    }
    
    // Verify the entry was inserted
    if (!data || data.length === 0) {
      return {
        name: 'Audit Logging Test',
        status: 'FAIL',
        message: 'Audit log entry was not created',
        duration: Date.now() - start
      }
    }
    
    // Clean up test entry
    await supabaseAdmin
      .from('audit_log')
      .delete()
      .eq('id', data[0].id)
    
    return {
      name: 'Audit Logging Test',
      status: 'PASS',
      message: 'Audit logging working correctly. Entry created and cleaned up.',
      duration: Date.now() - start
    }
  } catch (error) {
    return {
      name: 'Audit Logging Test',
      status: 'FAIL',
      message: `Audit test error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: Date.now() - start
    }
  }
}

async function testEventOutbox(): Promise<TestResult> {
  const start = Date.now()
  
  try {
    // Insert a test event
    const testEvent = {
      type: 'test_event',
      payload: { 
        test: 'data', 
        timestamp: new Date().toISOString(),
        source: 'rls_test'
      }
    }
    
    const { data, error } = await supabaseAdmin
      .from('event_outbox')
      .insert(testEvent)
      .select()
    
    if (error) {
      return {
        name: 'Event Outbox Test',
        status: 'FAIL',
        message: `Event outbox insert failed: ${error.message}`,
        duration: Date.now() - start
      }
    }
    
    // Verify the event was inserted with correct defaults
    if (!data || data.length === 0) {
      return {
        name: 'Event Outbox Test',
        status: 'FAIL',
        message: 'Event was not created in outbox',
        duration: Date.now() - start
      }
    }
    
    const event = data[0]
    if (event.delivered !== false || event.retries !== 0) {
      return {
        name: 'Event Outbox Test',
        status: 'FAIL',
        message: 'Event defaults not set correctly (delivered should be false, retries should be 0)',
        duration: Date.now() - start
      }
    }
    
    // Clean up test event
    await supabaseAdmin
      .from('event_outbox')
      .delete()
      .eq('id', event.id)
    
    return {
      name: 'Event Outbox Test',
      status: 'PASS',
      message: 'Event outbox working correctly. Event created with proper defaults.',
      duration: Date.now() - start
    }
  } catch (error) {
    return {
      name: 'Event Outbox Test',
      status: 'FAIL',
      message: `Event outbox test error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: Date.now() - start
    }
  }
}

async function runRLSPermissionTests(): Promise<void> {
  console.log('🔒 Running RLS and Permission tests...\n')
  
  const tests = [
    testRLSIsolation,
    testPermissionSystem,
    testAuditLogging,
    testEventOutbox
  ]
  
  const results: TestResult[] = []
  
  for (const test of tests) {
    console.log(`Running ${test.name}...`)
    const result = await test()
    results.push(result)
    
    const statusIcon = result.status === 'PASS' ? '✅' : '❌'
    console.log(`${statusIcon} ${result.name}: ${result.message} (${result.duration}ms)\n`)
  }
  
  // Summary
  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)
  
  console.log('📊 RLS/Permission Test Summary:')
  console.log(`   Total: ${results.length}`)
  console.log(`   Passed: ${passed}`)
  console.log(`   Failed: ${failed}`)
  console.log(`   Duration: ${totalDuration}ms`)
  
  if (failed > 0) {
    console.log('\n❌ Some RLS/Permission tests failed. Check the output above for details.')
    process.exit(1)
  } else {
    console.log('\n🎉 All RLS/Permission tests passed!')
  }
}

if (require.main === module) {
  runRLSPermissionTests().catch(console.error)
}

export { runRLSPermissionTests }
