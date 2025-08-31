import { supabaseAdmin } from '../lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface TestResult {
  name: string
  status: 'PASS' | 'FAIL'
  message: string
  duration: number
}

async function testDatabase(): Promise<TestResult> {
  const start = Date.now()
  
  try {
    // Test basic connection
    const { data, error } = await supabaseAdmin
      .from('orgs')
      .select('id, name')
      .limit(1)
    
    if (error) {
      return {
        name: 'Database Connection',
        status: 'FAIL',
        message: `Database error: ${error.message}`,
        duration: Date.now() - start
      }
    }
    
    // Test RLS context function
    const { error: contextError } = await supabaseAdmin.rpc('app.set_context', {
      p_org: '550e8400-e29b-41d4-a716-446655440000',
      p_location: '550e8400-e29b-41d4-a716-446655440001'
    })
    
    if (contextError) {
      return {
        name: 'Database Connection',
        status: 'FAIL',
        message: `Context function error: ${contextError.message}`,
        duration: Date.now() - start
      }
    }
    
    return {
      name: 'Database Connection',
      status: 'PASS',
      message: `Connected successfully. Found ${data?.length || 0} orgs. Context function working.`,
      duration: Date.now() - start
    }
  } catch (error) {
    return {
      name: 'Database Connection',
      status: 'FAIL',
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: Date.now() - start
    }
  }
}

async function testStorage(): Promise<TestResult> {
  const start = Date.now()
  
  try {
    // Test file upload
    const testContent = 'Test file content for smoke test'
    const fileName = `test-${Date.now()}.txt`
    const filePath = `org/550e8400-e29b-41d4-a716-446655440000/location/550e8400-e29b-41d4-a716-446655440001/smoke/${fileName}`
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('media')
      .upload(filePath, testContent, {
        contentType: 'text/plain'
      })
    
    if (uploadError) {
      return {
        name: 'Storage Upload/Download',
        status: 'FAIL',
        message: `Upload failed: ${uploadError.message}`,
        duration: Date.now() - start
      }
    }
    
    // Test signed URL generation
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('media')
      .createSignedUrl(filePath, 60) // 60 seconds expiry
    
    if (signedUrlError) {
      // Clean up uploaded file
      await supabaseAdmin.storage.from('media').remove([filePath])
      
      return {
        name: 'Storage Upload/Download',
        status: 'FAIL',
        message: `Signed URL generation failed: ${signedUrlError.message}`,
        duration: Date.now() - start
      }
    }
    
    // Test file download via signed URL
    const response = await fetch(signedUrlData.signedUrl)
    const downloadedContent = await response.text()
    
    if (downloadedContent !== testContent) {
      // Clean up uploaded file
      await supabaseAdmin.storage.from('media').remove([filePath])
      
      return {
        name: 'Storage Upload/Download',
        status: 'FAIL',
        message: 'Downloaded content does not match uploaded content',
        duration: Date.now() - start
      }
    }
    
    // Clean up test file
    const { error: deleteError } = await supabaseAdmin.storage
      .from('media')
      .remove([filePath])
    
    if (deleteError) {
      console.warn('Warning: Could not clean up test file:', deleteError.message)
    }
    
    return {
      name: 'Storage Upload/Download',
      status: 'PASS',
      message: `Upload, signed URL generation, download, and cleanup successful. File: ${fileName}`,
      duration: Date.now() - start
    }
  } catch (error) {
    return {
      name: 'Storage Upload/Download',
      status: 'FAIL',
      message: `Storage test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: Date.now() - start
    }
  }
}

async function testResend(): Promise<TestResult> {
  const start = Date.now()
  
  try {
    // Test email sending (dry run to a sink email)
    const { data, error } = await resend.emails.send({
      from: 'Staff Management <noreply@example.com>',
      to: ['no-reply@example.com'], // Sink email that won't notify users
      subject: 'Smoke Test - Staff Management System',
      html: `
        <h1>Smoke Test Email</h1>
        <p>This is a test email sent at ${new Date().toISOString()}</p>
        <p>If you receive this, the email service is working correctly.</p>
        <p><strong>Note:</strong> This is an automated test email.</p>
      `
    })
    
    if (error) {
      return {
        name: 'Email Service (Resend)',
        status: 'FAIL',
        message: `Email sending failed: ${error.message}`,
        duration: Date.now() - start
      }
    }
    
    return {
      name: 'Email Service (Resend)',
      status: 'PASS',
      message: `Email sent successfully. Message ID: ${data?.id || 'N/A'}`,
      duration: Date.now() - start
    }
  } catch (error) {
    return {
      name: 'Email Service (Resend)',
      status: 'FAIL',
      message: `Resend test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: Date.now() - start
    }
  }
}

async function runSmokeTests(): Promise<void> {
  console.log('🧪 Running smoke tests...\n')
  
  const tests = [
    testDatabase,
    testStorage,
    testResend
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
  
  console.log('📊 Test Summary:')
  console.log(`   Total: ${results.length}`)
  console.log(`   Passed: ${passed}`)
  console.log(`   Failed: ${failed}`)
  console.log(`   Duration: ${totalDuration}ms`)
  
  if (failed > 0) {
    console.log('\n❌ Some tests failed. Check the output above for details.')
    process.exit(1)
  } else {
    console.log('\n🎉 All smoke tests passed!')
  }
}

if (require.main === module) {
  runSmokeTests().catch(console.error)
}

export { runSmokeTests, testDatabase, testStorage, testResend }
