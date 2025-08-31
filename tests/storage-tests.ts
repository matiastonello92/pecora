import { supabaseAdmin } from '../lib/supabase/server'

/**
 * Storage Tests
 * Tests media bucket functionality and signed URLs
 */

async function testStorageBucket() {
  console.log('📦 Testing storage bucket...')
  
  try {
    // Check if media bucket exists
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets()
    
    if (bucketsError) {
      console.log('   ❌ Could not list buckets:', bucketsError.message)
      return false
    }
    
    const mediaBucket = buckets?.find(bucket => bucket.name === 'media')
    
    if (!mediaBucket) {
      console.log('   ❌ Media bucket not found')
      console.log('   💡 Create bucket "media" in Supabase Dashboard')
      return false
    }
    
    console.log('   ✅ Media bucket exists')
    console.log(`      ID: ${mediaBucket.id}`)
    console.log(`      Public: ${mediaBucket.public}`)
    console.log(`      Created: ${mediaBucket.created_at}`)
    
    return true
  } catch (error) {
    console.log('   ❌ Storage bucket test failed:', error instanceof Error ? error.message : 'Unknown error')
    return false
  }
}

async function testFileUpload() {
  console.log('📤 Testing file upload...')
  
  try {
    // Create test file content
    const testContent = `Test file created at ${new Date().toISOString()}\nThis is a test upload for the staff management system.`
    const testFileName = `test-uploads/bootstrap-test-${Date.now()}.txt`
    
    // Upload test file
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('media')
      .upload(testFileName, testContent, {
        contentType: 'text/plain',
        upsert: false
      })
    
    if (uploadError) {
      console.log('   ❌ File upload failed:', uploadError.message)
      return { success: false, fileName: null }
    }
    
    console.log('   ✅ File uploaded successfully')
    console.log(`      Path: ${uploadData.path}`)
    console.log(`      Size: ${testContent.length} bytes`)
    
    return { success: true, fileName: testFileName }
  } catch (error) {
    console.log('   ❌ File upload test failed:', error instanceof Error ? error.message : 'Unknown error')
    return { success: false, fileName: null }
  }
}

async function testSignedURL(fileName: string) {
  console.log('🔗 Testing signed URL generation...')
  
  try {
    // Generate signed URL for download
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('media')
      .createSignedUrl(fileName, 3600) // 1 hour expiry
    
    if (signedUrlError) {
      console.log('   ❌ Signed URL generation failed:', signedUrlError.message)
      return { success: false, url: null }
    }
    
    console.log('   ✅ Signed URL generated successfully')
    console.log(`      URL: ${signedUrlData.signedUrl.substring(0, 80)}...`)
    
    // Test downloading via signed URL
    try {
      const response = await fetch(signedUrlData.signedUrl)
      
      if (!response.ok) {
        console.log('   ❌ Signed URL download failed:', response.statusText)
        return { success: false, url: signedUrlData.signedUrl }
      }
      
      const content = await response.text()
      console.log('   ✅ File downloaded via signed URL')
      console.log(`      Content length: ${content.length} bytes`)
      
      return { success: true, url: signedUrlData.signedUrl }
    } catch (fetchError) {
      console.log('   ❌ Signed URL fetch failed:', fetchError instanceof Error ? fetchError.message : 'Unknown error')
      return { success: false, url: signedUrlData.signedUrl }
    }
  } catch (error) {
    console.log('   ❌ Signed URL test failed:', error instanceof Error ? error.message : 'Unknown error')
    return { success: false, url: null }
  }
}

async function testFileCleanup(fileName: string) {
  console.log('🧹 Testing file cleanup...')
  
  try {
    // Delete test file
    const { error: deleteError } = await supabaseAdmin.storage
      .from('media')
      .remove([fileName])
    
    if (deleteError) {
      console.log('   ❌ File cleanup failed:', deleteError.message)
      return false
    }
    
    console.log('   ✅ Test file cleaned up successfully')
    return true
  } catch (error) {
    console.log('   ❌ File cleanup test failed:', error instanceof Error ? error.message : 'Unknown error')
    return false
  }
}

async function testStoragePolicies() {
  console.log('🔒 Testing storage policies...')
  
  try {
    // Try to list files (should work with service role)
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from('media')
      .list('', {
        limit: 10
      })
    
    if (listError) {
      console.log('   ❌ Storage list failed:', listError.message)
      return false
    }
    
    console.log('   ✅ Storage list operation successful')
    console.log(`      Found ${files?.length || 0} files/folders`)
    
    return true
  } catch (error) {
    console.log('   ❌ Storage policies test failed:', error instanceof Error ? error.message : 'Unknown error')
    return false
  }
}

export async function runStorageTests() {
  console.log('🧪 STORAGE TESTS')
  console.log('=' .repeat(30))
  console.log('')
  
  let passedTests = 0
  let failedTests = 0
  let testFileName: string | null = null
  
  // Test 1: Storage bucket exists
  const bucketTest = await testStorageBucket()
  if (bucketTest) {
    passedTests++
  } else {
    failedTests++
    console.log('\n⚠️  Skipping remaining storage tests due to missing bucket')
    console.log('')
    return false
  }
  console.log('')
  
  // Test 2: File upload
  const uploadResult = await testFileUpload()
  if (uploadResult.success) {
    passedTests++
    testFileName = uploadResult.fileName
  } else {
    failedTests++
  }
  console.log('')
  
  // Test 3: Signed URL (only if upload succeeded)
  if (testFileName) {
    const signedUrlResult = await testSignedURL(testFileName)
    if (signedUrlResult.success) {
      passedTests++
    } else {
      failedTests++
    }
    console.log('')
  }
  
  // Test 4: Storage policies
  const policiesTest = await testStoragePolicies()
  if (policiesTest) {
    passedTests++
  } else {
    failedTests++
  }
  console.log('')
  
  // Test 5: Cleanup (only if we have a test file)
  if (testFileName) {
    const cleanupTest = await testFileCleanup(testFileName)
    if (cleanupTest) {
      passedTests++
    } else {
      failedTests++
    }
    console.log('')
  }
  
  console.log('📊 STORAGE TEST SUMMARY')
  console.log('=' .repeat(30))
  console.log(`✅ Passed: ${passedTests}`)
  console.log(`❌ Failed: ${failedTests}`)
  console.log(`📈 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`)
  
  if (failedTests === 0) {
    console.log('\n🎉 All storage tests passed!')
    console.log('Storage system is ready for production use.')
  } else {
    console.log('\n⚠️  Some storage tests failed.')
    console.log('Setup instructions:')
    console.log('1. Create bucket "media" in Supabase Dashboard')
    console.log('2. Add RLS policies for authenticated users')
    console.log('3. Test file upload/download functionality')
  }
  
  return failedTests === 0
}

if (require.main === module) {
  runStorageTests()
}
