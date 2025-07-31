#!/usr/bin/env node

/**
 * Robust Prisma migration deployment script for Railway
 * 
 * This script handles the P3005 error that occurs when:
 * - Database has existing tables (from previous deployment)
 * - But _prisma_migrations table is missing or incomplete
 * 
 * Solution approach:
 * 1. Try normal migration deployment first
 * 2. If P3005 error occurs, baseline existing migrations
 * 3. Retry migration deployment
 */

const { exec } = require('child_process');
const path = require('path');

// Change to server directory to ensure we're in the right location
process.chdir(path.join(__dirname, '..'));

console.log('[MIGRATION] Starting Prisma migration deployment...');
console.log('[MIGRATION] Current directory:', process.cwd());

// Ensure DATABASE_URL includes proper search path for multi-schema setup
if (process.env.DATABASE_URL) {
  let databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl.includes('postgresql') && !databaseUrl.includes('search_path') && !databaseUrl.includes('schema=')) {
    if (databaseUrl.includes('?')) {
      databaseUrl += '&search_path=anythingllm,public';
    } else {
      databaseUrl += '?search_path=anythingllm,public';
    }
    process.env.DATABASE_URL = databaseUrl;
    console.log('[MIGRATION] ✅ Added search_path to DATABASE_URL for multi-schema support');
  }
  console.log(`[MIGRATION] Schema configuration: ${process.env.DATABASE_URL.includes('search_path') ? 'Multi-schema (anythingllm,public)' : 'Default schema'}`);
}

/**
 * Execute a command and return a promise
 */
function executeCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`[MIGRATION] Executing: ${command}`);
    
    const child = exec(command, {
      cwd: process.cwd(),
      ...options
    }, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });

    // Stream output in real-time
    child.stdout?.on('data', (data) => {
      process.stdout.write(data);
    });

    child.stderr?.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}

/**
 * Check if error is the P3005 migration baseline error or failed migration error
 */
function isP3005Error(error) {
  const errorStr = error.toString().toLowerCase();
  return errorStr.includes('p3005') || 
         errorStr.includes('database schema is not empty') ||
         errorStr.includes('baseline an existing production database') ||
         errorStr.includes('baseline') ||
         errorStr.includes('failed migration') ||
         errorStr.includes('migration.*failed') ||
         errorStr.includes('20250720073934_init');
}

/**
 * Check if the specific failed migration 20250720073934_init is blocking deployment
 */
function isFailedInitMigration(error) {
  const errorStr = error.toString().toLowerCase();
  return errorStr.includes('20250720073934_init') ||
         errorStr.includes('init') && errorStr.includes('failed');
}

/**
 * Get the migration name from the migrations directory
 */
async function getInitialMigrationName() {
  try {
    const { stdout } = await executeCommand('ls -la prisma/migrations/', { stdio: 'pipe' });
    console.log('[MIGRATION] Available migrations:', stdout);
    
    // Look for the initial migration directory
    const lines = stdout.split('\n');
    for (const line of lines) {
      if (line.includes('_init') || line.includes('00000000000000')) {
        const parts = line.trim().split(/\s+/);
        const dirName = parts[parts.length - 1];
        if (dirName && dirName !== '.' && dirName !== '..') {
          console.log('[MIGRATION] Found initial migration:', dirName);
          return dirName;
        }
      }
    }
    
    // Fallback to the first migration found
    for (const line of lines) {
      if (line.startsWith('d') && !line.includes('.')) {
        const parts = line.trim().split(/\s+/);
        const dirName = parts[parts.length - 1];
        if (dirName && dirName !== '.' && dirName !== '..' && dirName.length > 10) {
          console.log('[MIGRATION] Using first migration found:', dirName);
          return dirName;
        }
      }
    }
    
    throw new Error('No migration directories found');
  } catch (error) {
    console.error('[MIGRATION] Error getting migration name:', error);
    throw error;
  }
}

/**
 * Baseline existing migrations to resolve P3005 error or failed migration
 */
async function baselineExistingMigrations() {
  console.log('[MIGRATION] Attempting to baseline existing migrations...');
  
  try {
    // Check if the specific failed migration exists and baseline it first
    const failedMigrationName = '20250720073934_init';
    const migrationExists = await checkMigrationExists(failedMigrationName);
    
    if (migrationExists) {
      console.log(`[MIGRATION] Found failed migration: ${failedMigrationName}, baselining it first...`);
      await executeCommand(`npx prisma migrate resolve --applied "${failedMigrationName}"`);
      console.log('[MIGRATION] Successfully baselined failed init migration');
    }
    
    // Get other migrations and baseline them
    const migrationName = await getInitialMigrationName();
    if (migrationName && migrationName !== failedMigrationName) {
      console.log(`[MIGRATION] Baselining additional migration: ${migrationName}`);
      await executeCommand(`npx prisma migrate resolve --applied "${migrationName}"`);
      console.log('[MIGRATION] Successfully baselined additional migration');
    }
    
    return true;
  } catch (error) {
    console.error('[MIGRATION] Failed to baseline migrations:', error);
    return false;
  }
}

/**
 * Check if a specific migration exists in the migrations directory
 */
async function checkMigrationExists(migrationName) {
  try {
    const { stdout } = await executeCommand('ls -la prisma/migrations/', { stdio: 'pipe' });
    return stdout.includes(migrationName);
  } catch (error) {
    console.error(`[MIGRATION] Error checking for migration ${migrationName}:`, error);
    return false;
  }
}

/**
 * Ensure anythingllm schema exists before migrations
 */
async function ensureAnythingLLMSchema() {
  console.log('[MIGRATION] Ensuring anythingllm schema exists...');
  
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Create anythingllm schema if it doesn't exist
    await prisma.$executeRaw`CREATE SCHEMA IF NOT EXISTS anythingllm;`;
    console.log('[MIGRATION] ✅ AnythingLLM schema ensured');
    
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.log('[MIGRATION] ⚠️  Schema creation failed, but continuing:', error.message);
    return false;
  }
}

/**
 * Verify tables exist in anythingllm schema after migration
 */
async function verifySchemaDeployment() {
  console.log('[MIGRATION] Verifying schema deployment...');
  
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Test critical tables in anythingllm schema
    await prisma.workspaces.findFirst();
    await prisma.system_settings.findFirst();
    await prisma.event_logs.findFirst();
    
    console.log('[MIGRATION] ✅ Tables verified in anythingllm schema');
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.log('[MIGRATION] ❌ Schema verification failed:', error.message);
    await this.prisma?.$disconnect?.();
    return false;
  }
}

/**
 * Main migration deployment function
 */
async function deployMigrations() {
  try {
    // First, generate the Prisma client
    console.log('[MIGRATION] Generating Prisma client...');
    await executeCommand('npx prisma generate');
    
    // Ensure anythingllm schema exists before any migration attempts
    await ensureAnythingLLMSchema();
    
    // Try normal migration deployment first
    console.log('[MIGRATION] Attempting normal migration deployment...');
    await executeCommand('npx prisma migrate deploy');
    
    // Verify that tables are properly deployed in anythingllm schema
    const verificationSuccess = await verifySchemaDeployment();
    if (!verificationSuccess) {
      console.log('[MIGRATION] ⚠️  Schema verification failed, attempting schema push...');
      
      // Try db push to ensure schema is properly synchronized
      await executeCommand('npx prisma db push --skip-generate');
      
      // Verify again after push
      const retryVerification = await verifySchemaDeployment();
      if (!retryVerification) {
        throw new Error('Schema verification failed after db push');
      }
    }
    
    console.log('[MIGRATION] ✅ Migration deployment successful!');
    return true;
    
  } catch (firstError) {
    console.log('[MIGRATION] Initial migration deployment failed');
    console.log('[MIGRATION] Error details:', firstError.stderr || firstError.error?.message);
    
    // Check if this is the P3005 error or failed migration error
    const isP3005 = isP3005Error(firstError.stderr || firstError.error?.message || '');
    const isFailedInit = isFailedInitMigration(firstError.stderr || firstError.error?.message || '');
    
    if (isP3005 || isFailedInit) {
      console.log('[MIGRATION] Detected migration baseline error - attempting to resolve...');
      
      if (isFailedInit) {
        console.log('[MIGRATION] Detected specific failed init migration (20250720073934_init)');
      }
      
      // Try to baseline existing migrations
      const baselineSuccess = await baselineExistingMigrations();
      
      if (baselineSuccess) {
        try {
          // Retry migration deployment after baselining
          console.log('[MIGRATION] Retrying migration deployment after baselining...');
          await executeCommand('npx prisma migrate deploy');
          
          console.log('[MIGRATION] ✅ Migration deployment successful after baselining!');
          return true;
          
        } catch (retryError) {
          console.error('[MIGRATION] ❌ Migration deployment failed even after baselining:', retryError);
          
          // Try one more time with forced resolution
          try {
            console.log('[MIGRATION] Attempting forced resolution of all migrations...');
            await executeCommand('npx prisma migrate resolve --applied 20250720073934_init');
            await executeCommand('npx prisma migrate deploy');
            
            console.log('[MIGRATION] ✅ Migration deployment successful after forced resolution!');
            return true;
          } catch (finalError) {
            console.error('[MIGRATION] ❌ All migration recovery attempts failed:', finalError);
            throw retryError;
          }
        }
      } else {
        console.error('[MIGRATION] ❌ Failed to baseline existing migrations');
        throw firstError;
      }
    } else {
      console.error('[MIGRATION] ❌ Migration deployment failed with non-baseline error:', firstError);
      throw firstError;
    }
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('[MIGRATION] =================================');
    console.log('[MIGRATION] Railway Prisma Migration Script');
    console.log('[MIGRATION] =================================');
    
    const success = await deployMigrations();
    
    if (success) {
      console.log('[MIGRATION] 🎉 All migrations completed successfully!');
      console.log('[MIGRATION] Starting server...');
      process.exit(0);
    }
  } catch (error) {
    console.error('[MIGRATION] 💥 Migration deployment failed completely:', error);
    console.error('[MIGRATION] This may require manual intervention');
    
    // Provide helpful error information
    console.log('\n[MIGRATION] Troubleshooting steps:');
    console.log('[MIGRATION] 1. Check Railway database logs');
    console.log('[MIGRATION] 2. Verify DATABASE_URL is correct');
    console.log('[MIGRATION] 3. Check if database is accessible');
    console.log('[MIGRATION] 4. Consider manual migration baseline');
    
    process.exit(1);
  }
}

// Only run if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = { 
  deployMigrations, 
  baselineExistingMigrations, 
  checkMigrationExists,
  isP3005Error,
  isFailedInitMigration,
  ensureAnythingLLMSchema,
  verifySchemaDeployment 
};