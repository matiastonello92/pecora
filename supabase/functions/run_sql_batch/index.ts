// @ts-nocheck
// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SqlBatchRequest {
  statements: string[]
  token?: string
}

interface SqlBatchResult {
  statement: string
  success: boolean
  error?: string
  rowCount?: number
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify service role authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the token is service role
    const token = authHeader.replace('Bearer ', '')
    if (token !== supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Service role access required' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const body: SqlBatchRequest = await req.json()
    
    if (!body.statements || !Array.isArray(body.statements)) {
      return new Response(
        JSON.stringify({ error: 'statements array required in body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`🔧 Executing ${body.statements.length} SQL statements...`)

    // Execute each statement
    const results: SqlBatchResult[] = []
    
    for (const statement of body.statements) {
      const trimmedStatement = statement.trim()
      
      if (!trimmedStatement || trimmedStatement.startsWith('--')) {
        // Skip empty statements and comments
        continue
      }

      try {
        console.log(`⚡ Executing: ${trimmedStatement.substring(0, 100)}...`)
        
        // Use rpc to execute raw SQL
        const { data, error, count } = await supabase.rpc('exec_sql', {
          sql_query: trimmedStatement
        })

        if (error) {
          // Check if it's an "already exists" error (which is OK for idempotent operations)
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate key') ||
              error.message.includes('relation') && error.message.includes('already exists')) {
            console.log(`⚠️ Statement skipped (already exists): ${error.message}`)
            results.push({
              statement: trimmedStatement.substring(0, 200),
              success: true,
              error: `Skipped: ${error.message}`
            })
          } else {
            console.log(`❌ Statement failed: ${error.message}`)
            results.push({
              statement: trimmedStatement.substring(0, 200),
              success: false,
              error: error.message
            })
          }
        } else {
          console.log(`✅ Statement executed successfully`)
          results.push({
            statement: trimmedStatement.substring(0, 200),
            success: true,
            rowCount: count || 0
          })
        }

      } catch (statementError) {
        const errorMessage = statementError instanceof Error ? statementError.message : 'Unknown error'
        console.log(`❌ Statement execution error: ${errorMessage}`)
        
        results.push({
          statement: trimmedStatement.substring(0, 200),
          success: false,
          error: errorMessage
        })
      }
    }

    // Summary
    const successCount = results.filter(r => r.success).length
    const errorCount = results.filter(r => !r.success).length
    
    console.log(`📊 Batch execution completed: ${successCount} success, ${errorCount} errors`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'SQL batch execution completed',
        summary: {
          total_statements: results.length,
          successful: successCount,
          errors: errorCount
        },
        results,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ SQL batch execution failed:', error)
    
    return new Response(
      JSON.stringify({
        error: 'SQL batch execution failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
