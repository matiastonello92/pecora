import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * Edge Function Test Endpoint
 * Tests the set_app_context Edge Function deployment and functionality
 * 
 * POST /api/internal/test/edge-function
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

    console.log('🧪 Testing Edge Function set_app_context...')

    // Create Supabase client
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get current user (if any)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    const testResults = {
      edge_function_url: '',
      auth_test: { success: false, message: '' },
      membership_test: { success: false, message: '' },
      context_test: { success: false, message: '' },
      overall_success: false
    }

    // Construct Edge Function URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      return NextResponse.json(
        { error: 'SUPABASE_URL not configured' },
        { status: 500 }
      )
    }

    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/set_app_context`
    testResults.edge_function_url = edgeFunctionUrl

    // Test 1: Auth requirement (should fail without JWT)
    console.log('🔐 Testing auth requirement...')
    try {
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          org_id: '550e8400-e29b-41d4-a716-446655440000',
          location_id: '550e8400-e29b-41d4-a716-446655440001'
        })
      })

      if (response.status === 401) {
        testResults.auth_test = {
          success: true,
          message: 'Correctly requires authentication (401 without JWT)'
        }
        console.log('   ✅ Auth requirement test passed')
      } else {
        testResults.auth_test = {
          success: false,
          message: `Expected 401, got ${response.status}`
        }
        console.log('   ❌ Auth requirement test failed')
      }
    } catch (error) {
      testResults.auth_test = {
        success: false,
        message: `Network error: ${error instanceof Error ? error.message : 'Unknown'}`
      }
      console.log('   ❌ Auth test network error:', error)
    }

    // Test 2: With user JWT (if available)
    if (user) {
      console.log('🔑 Testing with user JWT...')
      
      // Get user's session token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.access_token) {
        try {
          const response = await fetch(edgeFunctionUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              org_id: '550e8400-e29b-41d4-a716-446655440000',
              location_id: '550e8400-e29b-41d4-a716-446655440001'
            })
          })

          const responseData = await response.json()

          if (response.status === 200) {
            testResults.membership_test = {
              success: true,
              message: 'User has valid membership and context was set'
            }
            testResults.context_test = {
              success: true,
              message: 'Context setting successful'
            }
            console.log('   ✅ JWT test passed - user has membership')
          } else if (response.status === 403) {
            testResults.membership_test = {
              success: true,
              message: 'Correctly denies access for user without membership (403)'
            }
            console.log('   ✅ Membership validation working (user not in Demo Org)')
          } else {
            testResults.membership_test = {
              success: false,
              message: `Unexpected response: ${response.status} - ${JSON.stringify(responseData)}`
            }
            console.log('   ❌ Unexpected response:', response.status, responseData)
          }

        } catch (error) {
          testResults.membership_test = {
            success: false,
            message: `Network error with JWT: ${error instanceof Error ? error.message : 'Unknown'}`
          }
          console.log('   ❌ JWT test network error:', error)
        }
      } else {
        testResults.membership_test = {
          success: false,
          message: 'No access token available in session'
        }
        console.log('   ⚠️ No access token in session')
      }
    } else {
      testResults.membership_test = {
        success: true,
        message: 'No authenticated user - skipped JWT test (this is expected)'
      }
      console.log('   ⚠️ No authenticated user for JWT test')
    }

    // Test 3: Edge Function deployment check
    console.log('🌐 Testing Edge Function deployment...')
    try {
      const response = await fetch(edgeFunctionUrl, {
        method: 'GET' // Should return 405 Method Not Allowed
      })

      if (response.status === 405) {
        testResults.context_test = {
          success: true,
          message: 'Edge Function is deployed and responding (405 for GET method)'
        }
        console.log('   ✅ Edge Function deployment confirmed')
      } else {
        testResults.context_test = {
          success: false,
          message: `Edge Function may not be deployed - unexpected status: ${response.status}`
        }
        console.log('   ❌ Edge Function deployment issue')
      }
    } catch (error) {
      testResults.context_test = {
        success: false,
        message: `Edge Function not accessible: ${error instanceof Error ? error.message : 'Unknown'}`
      }
      console.log('   ❌ Edge Function not accessible:', error)
    }

    // Overall success
    testResults.overall_success = testResults.auth_test.success && 
                                  testResults.membership_test.success && 
                                  testResults.context_test.success

    console.log(`📊 Edge Function test completed: ${testResults.overall_success ? 'SUCCESS' : 'PARTIAL/FAILED'}`)

    return NextResponse.json({
      success: true,
      message: 'Edge Function testing completed',
      edge_function_url: edgeFunctionUrl,
      test_results: testResults,
      recommendations: [
        testResults.overall_success 
          ? 'Edge Function is working correctly'
          : 'Some tests failed - check deployment and configuration',
        'Ensure Edge Function is deployed: supabase functions deploy set_app_context',
        'Verify user has membership in Demo Organization for full testing'
      ],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Edge Function test failed:', error)
    return NextResponse.json(
      { 
        error: 'Edge Function test failed',
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
