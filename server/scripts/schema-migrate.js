#!/usr/bin/env node

/**
 * Schema Migration Script for AnythingLLM Multi-Schema Support
 * 
 * This script specifically handles migrating existing AnythingLLM deployments
 * from public schema to anythingllm schema for proper multi-service isolation.
 * 
 * Use this script when you encounter "table public.workspaces does not exist" errors.
 */

const { PrismaClient } = require("@prisma/client");
const { execSync } = require("child_process");

// eslint-disable-next-line no-console
console.log("[SCHEMA-MIGRATE] Starting AnythingLLM schema migration...");

async function migrateToMultiSchema() {
  const prisma = new PrismaClient();
  
  try {
    // eslint-disable-next-line no-console
console.log("[SCHEMA-MIGRATE] Checking database connection...");
    
    // Test basic connectivity
    await prisma.$queryRaw`SELECT 1 as test`;
    // eslint-disable-next-line no-console
console.log("[SCHEMA-MIGRATE] ✅ Database connection successful");
    
    // Create anythingllm schema
    await prisma.$executeRaw`CREATE SCHEMA IF NOT EXISTS anythingllm;`;
    // eslint-disable-next-line no-console
console.log("[SCHEMA-MIGRATE] ✅ AnythingLLM schema created/verified");
    
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
    
    // eslint-disable-next-line no-console
console.log("[SCHEMA-MIGRATE] Public schema workspaces exists:", publicWorkspaces[0].exists);
    // eslint-disable-next-line no-console
console.log("[SCHEMA-MIGRATE] AnythingLLM schema workspaces exists:", anythingllmWorkspaces[0].exists);
    
    // eslint-disable-next-line no-console
console.log("[SCHEMA-MIGRATE] 🔄 Checking tables and moving any in public -> anythingllm...");
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
        const inPublic = await prisma.$queryRaw`
          SELECT EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${table}
          ) as exists;
        `;
        // Check if table exists in anythingllm schema
        const inAnything = await prisma.$queryRaw`
          SELECT EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'anythingllm' 
            AND table_name = ${table}
          ) as exists;
        `;
        
        if (inPublic[0].exists && !inAnything[0].exists) {
          await prisma.$executeRawUnsafe(`ALTER TABLE public."${table}" SET SCHEMA anythingllm;`);
          console.log(`[SCHEMA-MIGRATE] ✅ Moved ${table} to anythingllm schema`);
        } else {
          console.log(`[SCHEMA-MIGRATE] ↔️  ${table}: public=${inPublic[0].exists ? 'yes' : 'no'}, anythingllm=${inAnything[0].exists ? 'yes' : 'no'} (no move)`);
        }
      } catch (error) {
        console.log(`[SCHEMA-MIGRATE] ⚠️  Could not move ${table}:`, error.message);
      }
    }
    
    // eslint-disable-next-line no-console
console.log("[SCHEMA-MIGRATE] ✅ Schema migration completed");
    
    // Generate new Prisma client with multi-schema support
    // eslint-disable-next-line no-console
console.log("[SCHEMA-MIGRATE] 🔄 Regenerating Prisma client...");
    execSync("npx prisma generate", { stdio: "inherit" });
    // eslint-disable-next-line no-console
console.log("[SCHEMA-MIGRATE] ✅ Prisma client regenerated");
    
    // Test final connectivity to workspaces table
    try {
      await prisma.workspaces.findFirst();
      // eslint-disable-next-line no-console
console.log("[SCHEMA-MIGRATE] ✅ Workspaces table accessible via Prisma");
    } catch (error) {
      console.log("[SCHEMA-MIGRATE] Workspaces table still not accessible:", error.message);
      throw error;
    }
    
  } catch (error) {
    console.error("[SCHEMA-MIGRATE] Migration failed:", error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute migration
migrateToMultiSchema()
  .then(() => {
    console.log("[SCHEMA-MIGRATE] Multi-schema migration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("[SCHEMA-MIGRATE] Migration failed:", error.message);
    process.exit(1);
  });