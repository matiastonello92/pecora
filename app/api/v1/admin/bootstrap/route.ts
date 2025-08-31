import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * Bootstrap endpoint - Idempotent user onboarding
 * Creates user record and assigns admin role in Demo Organization
 * 
 * POST /api/v1/admin/bootstrap
 * 
 * Requirements:
 * - User must be authenticated
 * - Creates user in users table if not exists
 * - Maps user to Demo Organization Lyon location
 * - Assigns admin role to user
 * - Idempotent - safe to call multiple times
 */
export async function POST(request: NextRequest) {
  try {
    // Create Supabase client with user's session
    const supabase = createRouteHandlerClient({ cookies })
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Constants for Demo Organization
    const DEMO_ORG_ID = '550e8400-e29b-41d4-a716-446655440000'
    const LYON_LOCATION_ID = '550e8400-e29b-41d4-a716-446655440001'
    const ADMIN_ROLE_ID = '40000000-0000-0000-0000-000000000001'

    // Start transaction-like operations
    const operations = []

    // 1. Ensure user exists in users table (idempotent)
    const { error: userInsertError } = await supabaseAdmin
      .from('users')
      .upsert(
        { 
          id: user.id,
          updated_at: new Date().toISOString()
        },
        { 
          onConflict: 'id',
          ignoreDuplicates: false 
        }
      )

    if (userInsertError) {
      console.error('Error creating user record:', userInsertError)
      return NextResponse.json(
        { error: 'Failed to create user record', details: userInsertError.message },
        { status: 500 }
      )
    }

    operations.push('User record created/updated')

    // 2. Ensure user is mapped to Demo Organization Lyon location (idempotent)
    const { error: locationMappingError } = await supabaseAdmin
      .from('users_locations')
      .upsert(
        {
          user_id: user.id,
          org_id: DEMO_ORG_ID,
          location_id: LYON_LOCATION_ID,
          created_at: new Date().toISOString()
        },
        { 
          onConflict: 'user_id,org_id,location_id',
          ignoreDuplicates: true 
        }
      )

    if (locationMappingError) {
      console.error('Error mapping user to location:', locationMappingError)
      return NextResponse.json(
        { error: 'Failed to map user to location', details: locationMappingError.message },
        { status: 500 }
      )
    }

    operations.push('User mapped to Demo Organization Lyon')

    // 3. Ensure user has admin role in Demo Organization (idempotent)
    const { error: roleAssignmentError } = await supabaseAdmin
      .from('user_roles')
      .upsert(
        {
          user_id: user.id,
          org_id: DEMO_ORG_ID,
          role_id: ADMIN_ROLE_ID,
          created_at: new Date().toISOString()
        },
        { 
          onConflict: 'user_id,org_id,role_id',
          ignoreDuplicates: true 
        }
      )

    if (roleAssignmentError) {
      console.error('Error assigning admin role:', roleAssignmentError)
      return NextResponse.json(
        { error: 'Failed to assign admin role', details: roleAssignmentError.message },
        { status: 500 }
      )
    }

    operations.push('Admin role assigned')

    // 4. Verify the setup by querying user's context
    const { data: userContext, error: contextError } = await supabaseAdmin
      .from('users_locations')
      .select(`
        org_id,
        location_id,
        orgs!inner(
          id,
          name
        ),
        locations!inner(
          id,
          name
        )
      `)
      .eq('user_id', user.id)
      .eq('org_id', DEMO_ORG_ID)

    if (contextError) {
      console.error('Error verifying user context:', contextError)
      return NextResponse.json(
        { error: 'Failed to verify user setup', details: contextError.message },
        { status: 500 }
      )
    }

    // 5. Get user's roles for verification
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select(`
        role_id,
        roles!inner(
          id,
          code,
          name
        )
      `)
      .eq('user_id', user.id)
      .eq('org_id', DEMO_ORG_ID)

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError)
      return NextResponse.json(
        { error: 'Failed to fetch user roles', details: rolesError.message },
        { status: 500 }
      )
    }

    // Success response with user context
    return NextResponse.json({
      success: true,
      message: 'User bootstrap completed successfully',
      operations,
      user: {
        id: user.id,
        email: user.email
      },
      context: {
        organizations: userContext?.map(ctx => ({
          id: ctx.orgs?.id,
          name: ctx.orgs?.name
        })) || [],
        locations: userContext?.map(ctx => ({
          id: ctx.locations?.id,
          name: ctx.locations?.name,
          org_id: ctx.org_id
        })) || [],
        roles: userRoles?.map(role => ({
          id: role.roles?.id,
          code: role.roles?.code,
          name: role.roles?.name
        })) || []
      },
      next_steps: [
        'User can now select Demo Organization in the UI',
        'User can switch between Lyon and Menton locations',
        'User has admin access to Users & Permissions page',
        'User can manage feature flags'
      ]
    })

  } catch (error) {
    console.error('Unexpected error in bootstrap:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Only allow POST requests
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  )
}
