import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

/**
 * Bootstrap Admin User - Idempotent
 * Creates admin user and assigns permissions if not exists
 * 
 * POST /api/v1/admin/bootstrap
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdminClient()
    console.log('🚀 Bootstrap admin user...')

    // Get current user from auth header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    
    // Verify token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const userId = user.id

    // Check if user already exists in users table
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('id', userId)
      .single()

    if (!existingUser) {
      // Create user record
      const { error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          id: userId,
          email: user.email,
          first_name: user.user_metadata?.first_name || 'Admin',
          last_name: user.user_metadata?.last_name || 'User',
          status: 'active'
        })

      if (userError) {
        console.error('Error creating user:', userError)
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        )
      }
    }

    // Get Demo Organization
    const { data: demoOrg } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .eq('name', 'Demo Organization')
      .single()

    if (!demoOrg) {
      return NextResponse.json(
        { error: 'Demo Organization not found' },
        { status: 404 }
      )
    }

    // Get Lyon location
    const { data: lyonLocation } = await supabaseAdmin
      .from('locations')
      .select('id, name')
      .eq('organization_id', demoOrg.id)
      .eq('name', 'Lyon')
      .single()

    if (!lyonLocation) {
      return NextResponse.json(
        { error: 'Lyon location not found' },
        { status: 404 }
      )
    }

    // Check if user_location already exists
    const { data: existingUserLocation } = await supabaseAdmin
      .from('users_locations')
      .select('id')
      .eq('user_id', userId)
      .eq('location_id', lyonLocation.id)
      .single()

    if (!existingUserLocation) {
      // Create user_location
      const { error: userLocationError } = await supabaseAdmin
        .from('users_locations')
        .insert({
          user_id: userId,
          location_id: lyonLocation.id,
          role: 'admin'
        })

      if (userLocationError) {
        console.error('Error creating user_location:', userLocationError)
        return NextResponse.json(
          { error: 'Failed to assign location' },
          { status: 500 }
        )
      }
    }

    // Check if organization role exists
    const { data: existingOrgRole } = await supabaseAdmin
      .from('users_organizations')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', demoOrg.id)
      .single()

    if (!existingOrgRole) {
      // Create organization role
      const { error: orgRoleError } = await supabaseAdmin
        .from('users_organizations')
        .insert({
          user_id: userId,
          organization_id: demoOrg.id,
          role: 'admin'
        })

      if (orgRoleError) {
        console.error('Error creating org role:', orgRoleError)
        return NextResponse.json(
          { error: 'Failed to assign organization role' },
          { status: 500 }
        )
      }
    }

    console.log('✅ Bootstrap completed successfully')

    return NextResponse.json({
      success: true,
      user_id: userId,
      org_id: demoOrg.id,
      location_ids: [lyonLocation.id],
      role: 'admin',
      message: 'Admin user bootstrapped successfully'
    })

  } catch (error) {
    console.error('❌ Bootstrap failed:', error)
    return NextResponse.json(
      { 
        error: 'Bootstrap failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Only allow POST
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  )
}
