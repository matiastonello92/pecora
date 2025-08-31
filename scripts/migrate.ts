import { supabaseAdmin } from '../lib/supabase/server'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

interface Migration {
  version: string
  filename: string
  sql: string
}

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n')

  try {
    // Read all migration files
    const migrationsDir = join(process.cwd(), 'migrations')
    const migrationFiles = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort()

    if (migrationFiles.length === 0) {
      console.log('❌ No migration files found in migrations/ directory')
      return
    }

    console.log(`📁 Found ${migrationFiles.length} migration file(s):`)
    migrationFiles.forEach(file => console.log(`   - ${file}`))
    console.log('')

    // Process each migration
    for (const filename of migrationFiles) {
      const version = filename.replace('.sql', '')
      const filePath = join(migrationsDir, filename)
      const sql = readFileSync(filePath, 'utf-8')

      console.log(`⚡ Applying migration: ${version}`)
      console.log(`   File: ${filename}`)
      console.log(`   Size: ${(sql.length / 1024).toFixed(1)}KB`)

      try {
        // Execute the migration SQL
        const { error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql })
        
        if (error) {
          // Try direct execution if rpc fails
          const { error: directError } = await supabaseAdmin
            .from('_temp_migration_exec')
            .select('*')
            .limit(1)

          // If that fails too, try raw query
          if (directError) {
            console.log('   ⚠️  Using raw SQL execution...')
            
            // Split SQL into individual statements
            const statements = sql
              .split(';')
              .map(stmt => stmt.trim())
              .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

            for (const statement of statements) {
              if (statement.trim()) {
                const { error: stmtError } = await supabaseAdmin
                  .rpc('exec_raw_sql', { query: statement })
                
                if (stmtError) {
                  console.log(`   ❌ Statement failed: ${statement.substring(0, 100)}...`)
                  console.log(`   Error: ${stmtError.message}`)
                  throw stmtError
                }
              }
            }
          } else {
            throw error
          }
        }

        console.log(`   ✅ Migration ${version} applied successfully`)

      } catch (migrationError) {
        console.error(`   ❌ Migration ${version} failed:`)
        console.error(`   Error: ${migrationError instanceof Error ? migrationError.message : 'Unknown error'}`)
        throw migrationError
      }

      console.log('')
    }

    // Verify migration success by checking key tables
    console.log('🔍 Verifying migration success...')
    
    const tablesToCheck = [
      'orgs', 'locations', 'users', 'users_locations',
      'modules', 'actions', 'permissions', 'roles',
      'feature_flags', 'audit_log', 'event_outbox'
    ]

    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('*')
          .limit(1)

        if (error) {
          console.log(`   ❌ Table '${table}': ${error.message}`)
        } else {
          console.log(`   ✅ Table '${table}': OK`)
        }
      } catch (error) {
        console.log(`   ❌ Table '${table}': ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Check if context function exists
    try {
      const { error: contextError } = await supabaseAdmin.rpc('app.set_context', {
        p_org: '00000000-0000-0000-0000-000000000000',
        p_location: '00000000-0000-0000-0000-000000000000'
      })

      if (contextError && !contextError.message.includes('does not exist')) {
        console.log(`   ✅ Function 'app.set_context': OK`)
      } else if (contextError) {
        console.log(`   ❌ Function 'app.set_context': ${contextError.message}`)
      } else {
        console.log(`   ✅ Function 'app.set_context': OK`)
      }
    } catch (error) {
      console.log(`   ❌ Function 'app.set_context': ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    console.log('\n🎉 All migrations completed successfully!')
    console.log('\n📋 Next steps:')
    console.log('   1. Run seed data: bun run seed')
    console.log('   2. Deploy Edge Function: supabase functions deploy set_app_context')
    console.log('   3. Create storage bucket "media" with policies')
    console.log('   4. Test the application')

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    console.error('\n🔧 Troubleshooting:')
    console.error('   1. Check Supabase connection and credentials')
    console.error('   2. Verify database permissions')
    console.error('   3. Check migration SQL syntax')
    console.error('   4. Review Supabase dashboard for errors')
    process.exit(1)
  }
}

if (require.main === module) {
  runMigrations()
}

export { runMigrations }
