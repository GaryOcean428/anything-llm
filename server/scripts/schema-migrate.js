#!/usr/bin/env node

/**
 * Schema Migration Script for AnythingLLM Multi-Schema Support
 * 
 * This script specifically handles migrating existing AnythingLLM deployments
 * from public schema to anythingllm schema for proper multi-service isolation.
 * 
 * Use this script when you encounter "table public.workspaces does not exist" errors.
 */

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

console.log('[SCHEMA-MIGRATE] Starting AnythingLLM schema migration...');

async function migrateToMultiSchema() {
  const prisma = new PrismaClient();
  
  try {
    console.log('[SCHEMA-MIGRATE] Checking database connection...');
    
    // Test basic connectivity
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('[SCHEMA-MIGRATE] ✅ Database connection successful');
    
    // Create anythingllm schema
    await prisma.$executeRaw`CREATE SCHEMA IF NOT EXISTS anythingllm;`;
    console.log('[SCHEMA-MIGRATE] ✅ AnythingLLM schema created/verified');
    
    // Check if workspaces table exists in public schema
    const publicWorkspaces = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'workspaces'
      ) as exists;
    `;
    
    const anythingllmWorkspaces = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'anythingllm' 
        AND table_name = 'workspaces'
      ) as exists;
    `;
    
    console.log('[SCHEMA-MIGRATE] Public schema workspaces exists:', publicWorkspaces[0].exists);
    console.log('[SCHEMA-MIGRATE] AnythingLLM schema workspaces exists:', anythingllmWorkspaces[0].exists);
    
    if (publicWorkspaces[0].exists && !anythingllmWorkspaces[0].exists) {
      console.log('[SCHEMA-MIGRATE] 🔄 Moving tables from public to anythingllm schema...');
      
      // List of all tables that should be in anythingllm schema
      const tables = [
        'api_keys', 'workspace_documents', 'invites', 'system_settings', 'users',
        'recovery_codes', 'password_reset_tokens', 'document_vectors', 'welcome_messages',
        'workspaces', 'workspace_threads', 'workspace_suggested_messages', 'workspace_chats',
        'workspace_agent_invocations', 'workspace_users', 'cache_data', 'embed_configs',
        'embed_chats', 'event_logs', 'slash_command_presets', 'document_sync_queues',
        'document_sync_executions', 'browser_extension_api_keys', 'temporary_auth_tokens',
        'system_prompt_variables', 'prompt_history'
      ];
      
      for (const table of tables) {
        try {
          // Check if table exists in public schema
          const tableExists = await prisma.$queryRaw`
            SELECT EXISTS (
              SELECT 1 
              FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = ${table}
            ) as exists;
          `;
          
          if (tableExists[0].exists) {
            // Move table to anythingllm schema
            await prisma.$executeRawUnsafe(`ALTER TABLE public."${table}" SET SCHEMA anythingllm;`);
            console.log(`[SCHEMA-MIGRATE] ✅ Moved ${table} to anythingllm schema`);
          }
        } catch (error) {
          console.log(`[SCHEMA-MIGRATE] ⚠️  Could not move ${table}:`, error.message);
        }
      }
      
      console.log('[SCHEMA-MIGRATE] ✅ Schema migration completed');
    } else if (anythingllmWorkspaces[0].exists) {
      console.log('[SCHEMA-MIGRATE] ✅ Tables already in anythingllm schema');
    } else {
      console.log('[SCHEMA-MIGRATE] ℹ️  No existing tables found, fresh deployment detected');
    }
    
    // Generate new Prisma client with multi-schema support
    console.log('[SCHEMA-MIGRATE] 🔄 Regenerating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('[SCHEMA-MIGRATE] ✅ Prisma client regenerated');
    
    // Test final connectivity to workspaces table
    try {
      await prisma.workspaces.findFirst();
      console.log('[SCHEMA-MIGRATE] ✅ Workspaces table accessible via Prisma');
    } catch (error) {
      console.log('[SCHEMA-MIGRATE] ❌ Workspaces table still not accessible:', error.message);
      throw error;
    }
    
  } catch (error) {
    console.error('[SCHEMA-MIGRATE] ❌ Migration failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute migration
migrateToMultiSchema()
  .then(() => {
    console.log('[SCHEMA-MIGRATE] 🎉 Multi-schema migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[SCHEMA-MIGRATE] 💥 Migration failed:', error.message);
    process.exit(1);
  });