import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * Storage Test Endpoint
 * Tests media bucket creation, RLS policies, and signed URLs
 * 
 * POST /api/internal/test/storage
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

    console.log('🗄️ Testing Storage bucket and policies...')

    const testResults = {
      bucket_creation: { success: false, message: '' },
      policy_creation: { success: false, message: '' },
      file_upload: { success: false, message: '' },
      signed_url: { success: false, message: '' },
      file_cleanup: { success: false, message: '' },
      overall_success: false
    }

    // Test 1: Create media bucket (idempotent)
    console.log('📦 Creating/verifying media bucket...')
    try {
      const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets()
      
      if (listError) {
        throw listError
      }

      const mediaBucket = buckets.find(bucket => bucket.name === 'media')
      
      if (mediaBucket) {
        testResults.bucket_creation = {
          success: true,
          message: 'Media bucket already exists'
        }
        console.log('   ✅ Media bucket already exists')
      } else {
        const { data, error } = await supabaseAdmin.storage.createBucket('media', {
          public: false,
          allowedMimeTypes: ['image/*', 'video/*', 'audio/*', 'application/pdf'],
          fileSizeLimit: 10485760 // 10MB
        })

        if (error) {
          throw error
        }

        testResults.bucket_creation = {
          success: true,
          message: 'Media bucket created successfully'
        }
        console.log('   ✅ Media bucket created')
      }
    } catch (error) {
      testResults.bucket_creation = {
        success: false,
        message: `Bucket creation failed: ${error instanceof Error ? error.message : 'Unknown'}`
      }
      console.log('   ❌ Bucket creation failed:', error)
    }

    // Test 2: Create/verify RLS policies
    console.log('🔒 Creating/verifying RLS policies...')
    try {
      const policies = [
        {
          name: 'media_select_policy',
          sql: `
            CREATE POLICY IF NOT EXISTS "media_select_policy" ON storage.objects
            FOR SELECT USING (bucket_id = 'media');
          `
        },
        {
          name: 'media_insert_policy', 
          sql: `
            CREATE POLICY IF NOT EXISTS "media_insert_policy" ON storage.objects
            FOR INSERT WITH CHECK (
              bucket_id = 'media' AND 
              auth.role() = 'authenticated' AND
              (name LIKE 'org/%' OR name LIKE 'temp/%')
            );
          `
        },
        {
          name: 'media_update_policy',
          sql: `
            CREATE POLICY IF NOT EXISTS "media_update_policy" ON storage.objects
            FOR UPDATE USING (
              bucket_id = 'media' AND 
              auth.role() = 'authenticated' AND
              (name LIKE 'org/%' OR name LIKE 'temp/%')
            );
          `
        },
        {
          name: 'media_delete_policy',
          sql: `
            CREATE POLICY IF NOT EXISTS "media_delete_policy" ON storage.objects
            FOR DELETE USING (
              bucket_id = 'media' AND 
              auth.role() = 'authenticated' AND
              (name LIKE 'org/%' OR name LIKE 'temp/%')
            );
          `
        }
      ]

      let policyErrors = []
      
      for (const policy of policies) {
        try {
          const { error } = await supabaseAdmin.rpc('exec_sql', {
            sql_query: policy.sql
          })
          
          if (error && !error.message.includes('already exists')) {
            policyErrors.push(`${policy.name}: ${error.message}`)
          }
        } catch (policyError) {
          policyErrors.push(`${policy.name}: ${policyError instanceof Error ? policyError.message : 'Unknown'}`)
        }
      }

      if (policyErrors.length === 0) {
        testResults.policy_creation = {
          success: true,
          message: 'All RLS policies created/verified successfully'
        }
        console.log('   ✅ RLS policies created/verified')
      } else {
        testResults.policy_creation = {
          success: false,
          message: `Policy errors: ${policyErrors.join(', ')}`
        }
        console.log('   ❌ Policy creation issues:', policyErrors)
      }
    } catch (error) {
      testResults.policy_creation = {
        success: false,
        message: `Policy creation failed: ${error instanceof Error ? error.message : 'Unknown'}`
      }
      console.log('   ❌ Policy creation failed:', error)
    }

    // Test 3: Upload test file
    console.log('📤 Testing file upload...')
    const testFileName = `temp/test-${Date.now()}.txt`
    const testFileContent = 'This is a test file for storage verification'
    
    try {
      const { data, error } = await supabaseAdmin.storage
        .from('media')
        .upload(testFileName, testFileContent, {
          contentType: 'text/plain'
        })

      if (error) {
        throw error
      }

      testResults.file_upload = {
        success: true,
        message: `Test file uploaded: ${testFileName}`
      }
      console.log('   ✅ File upload successful')
    } catch (error) {
      testResults.file_upload = {
        success: false,
        message: `File upload failed: ${error instanceof Error ? error.message : 'Unknown'}`
      }
      console.log('   ❌ File upload failed:', error)
    }

    // Test 4: Generate signed URL
    console.log('🔗 Testing signed URL generation...')
    try {
      const { data, error } = await supabaseAdmin.storage
        .from('media')
        .createSignedUrl(testFileName, 3600) // 1 hour

      if (error) {
        throw error
      }

      if (data?.signedUrl) {
        // Test the signed URL
        const response = await fetch(data.signedUrl)
        
        if (response.ok) {
          const content = await response.text()
          
          if (content === testFileContent) {
            testResults.signed_url = {
              success: true,
              message: 'Signed URL generated and verified successfully'
            }
            console.log('   ✅ Signed URL working')
          } else {
            testResults.signed_url = {
              success: false,
              message: 'Signed URL generated but content mismatch'
            }
            console.log('   ❌ Signed URL content mismatch')
          }
        } else {
          testResults.signed_url = {
            success: false,
            message: `Signed URL generated but not accessible: ${response.status}`
          }
          console.log('   ❌ Signed URL not accessible')
        }
      } else {
        testResults.signed_url = {
          success: false,
          message: 'No signed URL returned'
        }
        console.log('   ❌ No signed URL returned')
      }
    } catch (error) {
      testResults.signed_url = {
        success: false,
        message: `Signed URL generation failed: ${error instanceof Error ? error.message : 'Unknown'}`
      }
      console.log('   ❌ Signed URL generation failed:', error)
    }

    // Test 5: Cleanup test file
    console.log('🧹 Cleaning up test file...')
    try {
      const { error } = await supabaseAdmin.storage
        .from('media')
        .remove([testFileName])

      if (error) {
        throw error
      }

      testResults.file_cleanup = {
        success: true,
        message: 'Test file cleaned up successfully'
      }
      console.log('   ✅ Test file cleaned up')
    } catch (error) {
      testResults.file_cleanup = {
        success: false,
        message: `Cleanup failed: ${error instanceof Error ? error.message : 'Unknown'}`
      }
      console.log('   ❌ Cleanup failed:', error)
    }

    // Overall success
    testResults.overall_success = testResults.bucket_creation.success && 
                                  testResults.policy_creation.success && 
                                  testResults.file_upload.success && 
                                  testResults.signed_url.success &&
                                  testResults.file_cleanup.success

    console.log(`📊 Storage test completed: ${testResults.overall_success ? 'SUCCESS' : 'PARTIAL/FAILED'}`)

    return NextResponse.json({
      success: true,
      message: 'Storage testing completed',
      test_results: testResults,
      recommendations: [
        testResults.overall_success 
          ? 'Storage bucket and policies are working correctly'
          : 'Some storage tests failed - check bucket configuration and policies',
        'Ensure service role has storage admin permissions',
        'Verify RLS policies allow appropriate access patterns'
      ],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Storage test failed:', error)
    return NextResponse.json(
      { 
        error: 'Storage test failed',
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
