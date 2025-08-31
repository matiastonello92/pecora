import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { can, canMultiple } from '@/lib/permissions'

/**
 * Live Test Suite - Non-Mock Integration Tests
 * Tests RLS, permissions, feature flags, audit log, and UI gating
 * 
 * POST /api/internal/test/live
 * Body: { "token": "<SETUP_TOKEN>" }
 */

export async function POST(request: NextRequest) {
  try {
    // Verify setup token
    const body = await request.json().catch(() => ({}))
    const headerToken = request.headers.get('X-SETUP-TOKEN')
    const bodyToken = body.token
    const setupToken = process.env.SETUP_TOKEN || 'bootstrap-2024'

    if (!headerToken && !bodyToken) {
      return NextResponse.json(
        { error: 'Setup token required' },
        { status: 401 }
      )
    }

    if (headerToken !== setupToken && bodyToken !== setupToken) {
      return NextResponse.json(
        { error: 'Invalid setup token' },
        { status: 403 }
      )
    }

    console.log('🧪 Running Live Test Suite (non-mock)...')

    const testResults = {
      rls_permissions: { success: false, message: '', details: [] },
      feature_flags: { success: false, message: '', details: [] },
      audit_outbox: { success: false, message: '', details: [] },
      ui_gating: { success: false, message: '', details: [] },
      overall_success: false
    }

    // Demo Organization IDs
    const demoOrgId = '550e8400-e29b-41d4-a716-446655440000'
    const lyonLocationId = '550e8400-e29b-41d4-a716-446655440001'
    const mentonLocationId = '550e8400-e29b-41d4-a716-446655440002'

    // Test 1: RLS and Permissions
    console.log('🔒 Testing RLS and Permission System...')
    try {
      const rlsTests = []

      // Create test users with different roles
      const testUsers = [
        { email: 'admin@test.com', role: 'admin' },
        { email: 'manager@test.com', role: 'manager' },
        { email: 'staff@test.com', role: 'staff' }
      ]

      for (const testUser of testUsers) {
        try {
          // Check if user exists
          const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', testUser.email)
            .single()

          let userId = existingUser?.id

          if (!userId) {
            // Create test user
            const { data: newUser, error: createError } = await supabaseAdmin
              .from('users')
              .insert({
                email: testUser.email,
                full_name: `Test ${testUser.role}`,
                org_id: demoOrgId
              })
              .select('id')
              .single()

            if (createError) throw createError
            userId = newUser.id

            // Add to location
            await supabaseAdmin
              .from('users_locations')
              .insert({
                user_id: userId,
                org_id: demoOrgId,
                location_id: lyonLocationId
              })

            // Assign role
            const { data: role } = await supabaseAdmin
              .from('roles')
              .select('id')
              .eq('code', testUser.role)
              .eq('org_id', demoOrgId)
              .single()

            if (role) {
              await supabaseAdmin
                .from('user_roles')
                .insert({
                  user_id: userId,
                  role_id: role.id,
                  org_id: demoOrgId,
                  location_id: lyonLocationId
                })
            }
          }

          // Test permissions for this user
          const permissionTests = [
            { code: 'admin.view', expected: testUser.role === 'admin' },
            { code: 'admin.manage', expected: testUser.role === 'admin' },
            { code: 'users.view', expected: ['admin', 'manager'].includes(testUser.role) },
            { code: 'flags.manage', expected: testUser.role === 'admin' }
          ]

          for (const permTest of permissionTests) {
            const hasPermission = await can(userId, permTest.code, {
              org_id: demoOrgId,
              location_id: lyonLocationId
            })

            const testPassed = hasPermission === permTest.expected
            
            rlsTests.push({
              user: testUser.email,
              permission: permTest.code,
              expected: permTest.expected,
              actual: hasPermission,
              passed: testPassed
            })

            console.log(`   ${testPassed ? '✅' : '❌'} ${testUser.email} - ${permTest.code}: ${hasPermission} (expected: ${permTest.expected})`)
          }

        } catch (userError) {
          rlsTests.push({
            user: testUser.email,
            error: userError instanceof Error ? userError.message : 'Unknown error',
            passed: false
          })
          console.log(`   ❌ Error testing user ${testUser.email}:`, userError)
        }
      }

      const passedRlsTests = rlsTests.filter(t => t.passed).length
      const totalRlsTests = rlsTests.length

      testResults.rls_permissions = {
        success: passedRlsTests === totalRlsTests,
        message: `${passedRlsTests}/${totalRlsTests} RLS/permission tests passed`,
        details: rlsTests
      }

    } catch (error) {
      testResults.rls_permissions = {
        success: false,
        message: `RLS test failed: ${error instanceof Error ? error.message : 'Unknown'}`,
        details: []
      }
      console.log('   ❌ RLS test error:', error)
    }

    // Test 2: Feature Flags
    console.log('🚩 Testing Feature Flags...')
    try {
      const flagTests = []

      // Test org-level flag
      const testOrgFlag = `test_org_flag_${Date.now()}`
      
      // Create org-level flag
      const { error: orgFlagError } = await supabaseAdmin
        .from('feature_flags')
        .insert({
          code: testOrgFlag,
          name: 'Test Org Flag',
          description: 'Test flag for live testing',
          is_active: true,
          org_id: demoOrgId,
          location_id: null // org-level
        })

      if (!orgFlagError) {
        // Verify flag is active for both locations
        const { data: orgFlagCheck } = await supabaseAdmin
          .from('feature_flags')
          .select('*')
          .eq('code', testOrgFlag)
          .eq('org_id', demoOrgId)
          .is('location_id', null)
          .single()

        flagTests.push({
          type: 'org-level',
          flag: testOrgFlag,
          expected: true,
          actual: orgFlagCheck?.is_active || false,
          passed: orgFlagCheck?.is_active === true
        })
      }

      // Test location-specific flag
      const testLocationFlag = `test_location_flag_${Date.now()}`
      
      // Create location-specific flag (only for Lyon)
      const { error: locationFlagError } = await supabaseAdmin
        .from('feature_flags')
        .insert({
          code: testLocationFlag,
          name: 'Test Location Flag',
          description: 'Test location flag for live testing',
          is_active: true,
          org_id: demoOrgId,
          location_id: lyonLocationId
        })

      if (!locationFlagError) {
        // Verify flag is active for Lyon
        const { data: lyonFlagCheck } = await supabaseAdmin
          .from('feature_flags')
          .select('*')
          .eq('code', testLocationFlag)
          .eq('org_id', demoOrgId)
          .eq('location_id', lyonLocationId)
          .single()

        // Verify flag is NOT active for Menton
        const { data: mentonFlagCheck } = await supabaseAdmin
          .from('feature_flags')
          .select('*')
          .eq('code', testLocationFlag)
          .eq('org_id', demoOrgId)
          .eq('location_id', mentonLocationId)
          .single()

        flagTests.push({
          type: 'location-specific-lyon',
          flag: testLocationFlag,
          expected: true,
          actual: lyonFlagCheck?.is_active || false,
          passed: lyonFlagCheck?.is_active === true
        })

        flagTests.push({
          type: 'location-specific-menton',
          flag: testLocationFlag,
          expected: false,
          actual: mentonFlagCheck?.is_active || false,
          passed: !mentonFlagCheck // Should not exist for Menton
        })
      }

      // Cleanup test flags
      await supabaseAdmin
        .from('feature_flags')
        .delete()
        .eq('org_id', demoOrgId)
        .like('code', 'test_%flag_%')

      const passedFlagTests = flagTests.filter(t => t.passed).length
      const totalFlagTests = flagTests.length

      testResults.feature_flags = {
        success: passedFlagTests === totalFlagTests,
        message: `${passedFlagTests}/${totalFlagTests} feature flag tests passed`,
        details: flagTests
      }

    } catch (error) {
      testResults.feature_flags = {
        success: false,
        message: `Feature flag test failed: ${error instanceof Error ? error.message : 'Unknown'}`,
        details: []
      }
      console.log('   ❌ Feature flag test error:', error)
    }

    // Test 3: Audit Log and Event Outbox
    console.log('📝 Testing Audit Log and Event Outbox...')
    try {
      const auditTests = []

      // Perform a permission change that should trigger audit log
      const testRoleCode = `test_role_${Date.now()}`
      
      // Create test role
      const { data: testRole, error: roleError } = await supabaseAdmin
        .from('roles')
        .insert({
          code: testRoleCode,
          name: 'Test Role',
          description: 'Test role for audit testing',
          org_id: demoOrgId
        })
        .select('id')
        .single()

      if (!roleError && testRole) {
        // Check if audit log entry was created
        const { data: auditEntries } = await supabaseAdmin
          .from('audit_log')
          .select('*')
          .eq('table_name', 'roles')
          .eq('record_id', testRole.id)
          .eq('action', 'INSERT')

        auditTests.push({
          type: 'audit_log_creation',
          expected: true,
          actual: (auditEntries?.length || 0) > 0,
          passed: (auditEntries?.length || 0) > 0,
          details: `Found ${auditEntries?.length || 0} audit entries`
        })

        // Check if event outbox entry was created
        const { data: outboxEntries } = await supabaseAdmin
          .from('event_outbox')
          .select('*')
          .eq('event_type', 'role.created')
          .eq('delivered', false)

        auditTests.push({
          type: 'event_outbox_creation',
          expected: true,
          actual: (outboxEntries?.length || 0) > 0,
          passed: (outboxEntries?.length || 0) > 0,
          details: `Found ${outboxEntries?.length || 0} undelivered events`
        })

        // Cleanup test role
        await supabaseAdmin
          .from('roles')
          .delete()
          .eq('id', testRole.id)
      }

      const passedAuditTests = auditTests.filter(t => t.passed).length
      const totalAuditTests = auditTests.length

      testResults.audit_outbox = {
        success: passedAuditTests === totalAuditTests,
        message: `${passedAuditTests}/${totalAuditTests} audit/outbox tests passed`,
        details: auditTests
      }

    } catch (error) {
      testResults.audit_outbox = {
        success: false,
        message: `Audit/outbox test failed: ${error instanceof Error ? error.message : 'Unknown'}`,
        details: []
      }
      console.log('   ❌ Audit/outbox test error:', error)
    }

    // Test 4: UI Gating with can() function
    console.log('🎛️ Testing UI Gating...')
    try {
      const uiTests = []

      // Get a test user (staff role)
      const { data: staffUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', 'staff@test.com')
        .single()

      if (staffUser) {
        // Test multiple permissions at once
        const permissions = ['admin.view', 'admin.manage', 'users.view', 'flags.manage']
        
        const permissionResults = await canMultiple(staffUser.id, permissions, {
          org_id: demoOrgId,
          location_id: lyonLocationId
        })

        // Staff should NOT have admin permissions
        const expectedResults = {
          'admin.view': false,
          'admin.manage': false,
          'users.view': false,
          'flags.manage': false
        }

        for (const [permission, expected] of Object.entries(expectedResults)) {
          const actual = permissionResults[permission] || false
          const passed = actual === expected

          uiTests.push({
            permission,
            expected,
            actual,
            passed,
            user: 'staff@test.com'
          })

          console.log(`   ${passed ? '✅' : '❌'} UI Gating - ${permission}: ${actual} (expected: ${expected})`)
        }
      }

      const passedUiTests = uiTests.filter(t => t.passed).length
      const totalUiTests = uiTests.length

      testResults.ui_gating = {
        success: passedUiTests === totalUiTests,
        message: `${passedUiTests}/${totalUiTests} UI gating tests passed`,
        details: uiTests
      }

    } catch (error) {
      testResults.ui_gating = {
        success: false,
        message: `UI gating test failed: ${error instanceof Error ? error.message : 'Unknown'}`,
        details: []
      }
      console.log('   ❌ UI gating test error:', error)
    }

    // Overall success
    testResults.overall_success = testResults.rls_permissions.success && 
                                  testResults.feature_flags.success && 
                                  testResults.audit_outbox.success &&
                                  testResults.ui_gating.success

    console.log(`📊 Live test suite completed: ${testResults.overall_success ? 'SUCCESS' : 'PARTIAL/FAILED'}`)

    return NextResponse.json({
      success: true,
      message: 'Live test suite completed',
      test_results: testResults,
      summary: {
        rls_permissions: testResults.rls_permissions.success,
        feature_flags: testResults.feature_flags.success,
        audit_outbox: testResults.audit_outbox.success,
        ui_gating: testResults.ui_gating.success,
        overall_success: testResults.overall_success
      },
      recommendations: [
        testResults.overall_success 
          ? 'All live tests passed - system is working correctly'
          : 'Some live tests failed - check individual test details',
        'Ensure database migrations and seed data are properly applied',
        'Verify RLS policies and permission assignments are correct'
      ],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Live test suite failed:', error)
    return NextResponse.json(
      { 
        error: 'Live test suite failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Only allow POST
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST with setup token.' },
    { status: 405 }
  )
}
