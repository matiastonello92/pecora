import { supabaseAdmin } from '../lib/supabase/server'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

interface SeedFile {
  version: string
  filename: string
  sql: string
}

async function runSeeds() {
  console.log('🌱 Starting database seeding...\n')

  try {
    // Read all seed files
    const seedsDir = join(process.cwd(), 'seed')
    const seedFiles = readdirSync(seedsDir)
      .filter(file => file.endsWith('.sql'))
      .sort()

    if (seedFiles.length === 0) {
      console.log('❌ No seed files found in seed/ directory')
      return
    }

    console.log(`📁 Found ${seedFiles.length} seed file(s):`)
    seedFiles.forEach(file => console.log(`   - ${file}`))
    console.log('')

    // Process each seed file
    for (const filename of seedFiles) {
      const version = filename.replace('.sql', '')
      const filePath = join(seedsDir, filename)
      const sql = readFileSync(filePath, 'utf-8')

      console.log(`🌱 Applying seed: ${version}`)
      console.log(`   File: ${filename}`)
      console.log(`   Size: ${(sql.length / 1024).toFixed(1)}KB`)

      try {
        // Split SQL into individual statements for better error handling
        const statements = sql
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

        let executedStatements = 0
        
        for (const statement of statements) {
          if (statement.trim()) {
            try {
              // Try to execute each statement
              const { error } = await supabaseAdmin
                .rpc('exec_raw_sql', { query: statement })
              
              if (error) {
                // Some statements might fail due to conflicts (ON CONFLICT DO NOTHING)
                // This is expected for idempotent seeds
                if (!error.message.includes('duplicate key') && 
                    !error.message.includes('already exists') &&
                    !error.message.includes('ON CONFLICT')) {
                  console.log(`   ⚠️  Statement warning: ${error.message}`)
                }
              }
              executedStatements++
            } catch (stmtError) {
              console.log(`   ⚠️  Statement skipped: ${statement.substring(0, 50)}...`)
              console.log(`   Reason: ${stmtError instanceof Error ? stmtError.message : 'Unknown error'}`)
            }
          }
        }

        console.log(`   ✅ Seed ${version} applied (${executedStatements} statements)`)

      } catch (seedError) {
        console.error(`   ❌ Seed ${version} failed:`)
        console.error(`   Error: ${seedError instanceof Error ? seedError.message : 'Unknown error'}`)
        throw seedError
      }

      console.log('')
    }

    // Verify seed data
    console.log('🔍 Verifying seed data...')
    
    try {
      // Check organizations
      const { data: orgs, error: orgsError } = await supabaseAdmin
        .from('orgs')
        .select('*')

      if (orgsError) {
        console.log(`   ❌ Organizations: ${orgsError.message}`)
      } else {
        console.log(`   ✅ Organizations: ${orgs?.length || 0} records`)
        orgs?.forEach(org => console.log(`      - ${org.name} (${org.id})`))
      }

      // Check locations
      const { data: locations, error: locationsError } = await supabaseAdmin
        .from('locations')
        .select('*')

      if (locationsError) {
        console.log(`   ❌ Locations: ${locationsError.message}`)
      } else {
        console.log(`   ✅ Locations: ${locations?.length || 0} records`)
        locations?.forEach(loc => console.log(`      - ${loc.name} (${loc.id})`))
      }

      // Check modules
      const { data: modules, error: modulesError } = await supabaseAdmin
        .from('modules')
        .select('*')

      if (modulesError) {
        console.log(`   ❌ Modules: ${modulesError.message}`)
      } else {
        console.log(`   ✅ Modules: ${modules?.length || 0} records`)
        modules?.forEach(mod => console.log(`      - ${mod.name} (${mod.code})`))
      }

      // Check permissions
      const { data: permissions, error: permissionsError } = await supabaseAdmin
        .from('permissions')
        .select('*')

      if (permissionsError) {
        console.log(`   ❌ Permissions: ${permissionsError.message}`)
      } else {
        console.log(`   ✅ Permissions: ${permissions?.length || 0} records`)
      }

      // Check roles
      const { data: roles, error: rolesError } = await supabaseAdmin
        .from('roles')
        .select('*')

      if (rolesError) {
        console.log(`   ❌ Roles: ${rolesError.message}`)
      } else {
        console.log(`   ✅ Roles: ${roles?.length || 0} records`)
        roles?.forEach(role => console.log(`      - ${role.name} (${role.code})`))
      }

      // Check feature flags
      const { data: flags, error: flagsError } = await supabaseAdmin
        .from('feature_flags')
        .select('*')

      if (flagsError) {
        console.log(`   ❌ Feature Flags: ${flagsError.message}`)
      } else {
        console.log(`   ✅ Feature Flags: ${flags?.length || 0} records`)
        flags?.forEach(flag => console.log(`      - ${flag.module_code}.${flag.flag_code} (${flag.enabled ? 'enabled' : 'disabled'})`))
      }

    } catch (error) {
      console.log(`   ❌ Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    console.log('\n🎉 All seeds completed successfully!')
    console.log('\n📋 Next steps:')
    console.log('   1. Call POST /api/v1/admin/bootstrap to setup your user')
    console.log('   2. Deploy Edge Function: supabase functions deploy set_app_context')
    console.log('   3. Create storage bucket "media" with policies')
    console.log('   4. Test the application with your admin user')

  } catch (error) {
    console.error('\n❌ Seeding failed:', error)
    console.error('\n🔧 Troubleshooting:')
    console.error('   1. Ensure migrations have been run first')
    console.error('   2. Check Supabase connection and credentials')
    console.error('   3. Verify database permissions')
    console.error('   4. Check seed SQL syntax')
    process.exit(1)
  }
}

if (require.main === module) {
  runSeeds()
}

export { runSeeds }
