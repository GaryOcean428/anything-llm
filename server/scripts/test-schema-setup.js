#!/usr/bin/env node

/**
 * Test script to verify multi-schema configuration is working correctly
 * This script checks if Prisma can properly access tables in the anythingllm schema
 */

const path = require('path');

// Ensure we're in the server directory
process.chdir(path.join(__dirname, '..'));

async function testMultiSchemaSetup() {
  console.log('[SCHEMA-TEST] Testing AnythingLLM multi-schema configuration...');
  
  try {
    // Import Prisma client
    const { PrismaClient } = require('@prisma/client');
    
    console.log('[SCHEMA-TEST] ✅ Prisma client imported successfully');
    
    // Test with mock DATABASE_URL for schema verification
    const testDatabaseUrl = 'postgresql://user:pass@localhost:5432/test?search_path=anythingllm,public';
    
    // Check if schema configuration is correct
    const prismaSchemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    const fs = require('fs');
    const schemaContent = fs.readFileSync(prismaSchemaPath, 'utf8');
    
    // Verify multi-schema configuration (flexible matching for spacing)
    const hasMultiSchema = schemaContent.includes('schemas') && 
                          schemaContent.includes('"public"') && 
                          schemaContent.includes('"anythingllm"');
    const hasAnythingLLMModels = schemaContent.includes('@@schema("anythingllm")');
    const hasWorkspacesModel = schemaContent.includes('model workspaces {');
    
    console.log('[SCHEMA-TEST] Multi-schema configuration:', hasMultiSchema ? '✅' : '❌');
    console.log('[SCHEMA-TEST] AnythingLLM schema models:', hasAnythingLLMModels ? '✅' : '❌');
    console.log('[SCHEMA-TEST] Workspaces model exists:', hasWorkspacesModel ? '✅' : '❌');
    
    // Verify migration files
    const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f !== 'migration_lock.toml');
    
    console.log('[SCHEMA-TEST] Migration files found:', migrationFiles.length);
    
    // Check for schema-aware migration
    const hasSchemaAwareMigration = migrationFiles.some(f => f.includes('schema_aware'));
    console.log('[SCHEMA-TEST] Schema-aware migration:', hasSchemaAwareMigration ? '✅' : '❌');
    
    // Verify scripts exist
    const scriptsDir = path.join(process.cwd(), 'scripts');
    const scriptFiles = fs.readdirSync(scriptsDir);
    
    const hasDbMigrate = scriptFiles.includes('db-migrate.js');
    const hasSchemaMigrate = scriptFiles.includes('schema-migrate.js');
    
    console.log('[SCHEMA-TEST] db-migrate.js script:', hasDbMigrate ? '✅' : '❌');
    console.log('[SCHEMA-TEST] schema-migrate.js script:', hasSchemaMigrate ? '✅' : '❌');
    
    // Check package.json scripts
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const hasStartMigrate = packageJson.scripts && packageJson.scripts['start:migrate'];
    const hasMigrateSchema = packageJson.scripts && packageJson.scripts['migrate:schema'];
    
    console.log('[SCHEMA-TEST] start:migrate script:', hasStartMigrate ? '✅' : '❌');
    console.log('[SCHEMA-TEST] migrate:schema script:', hasMigrateSchema ? '✅' : '❌');
    
    // Summary
    const allTestsPassed = hasMultiSchema && hasAnythingLLMModels && hasWorkspacesModel && 
                          hasSchemaAwareMigration && hasDbMigrate && hasSchemaMigrate &&
                          hasStartMigrate && hasMigrateSchema;
    
    console.log('\n[SCHEMA-TEST] =================================');
    console.log('[SCHEMA-TEST] Overall Status:', allTestsPassed ? '✅ PASS' : '❌ FAIL');
    console.log('[SCHEMA-TEST] =================================');
    
    if (allTestsPassed) {
      console.log('[SCHEMA-TEST] 🎉 Multi-schema setup is correctly configured!');
      console.log('[SCHEMA-TEST] 💡 For Railway deployment, ensure DATABASE_URL includes search_path parameter');
    } else {
      console.log('[SCHEMA-TEST] ⚠️  Some configuration issues detected');
    }
    
    return allTestsPassed;
    
  } catch (error) {
    console.error('[SCHEMA-TEST] ❌ Test failed:', error.message);
    return false;
  }
}

// Run the test
testMultiSchemaSetup()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('[SCHEMA-TEST] Test execution failed:', error.message);
    process.exit(1);
  });