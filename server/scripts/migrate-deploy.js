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
 * Check if error is the P3005 migration baseline error
 */
function isP3005Error(error) {
  const errorStr = error.toString().toLowerCase();
  return errorStr.includes('p3005') || 
         errorStr.includes('database schema is not empty') ||
         errorStr.includes('baseline an existing production database');
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
 * Baseline existing migrations to resolve P3005 error
 */
async function baselineExistingMigrations() {
  console.log('[MIGRATION] Attempting to baseline existing migrations...');
  
  try {
    const migrationName = await getInitialMigrationName();
    console.log(`[MIGRATION] Baselining migration: ${migrationName}`);
    
    await executeCommand(`npx prisma migrate resolve --applied "${migrationName}"`);
    console.log('[MIGRATION] Successfully baselined existing migration');
    return true;
  } catch (error) {
    console.error('[MIGRATION] Failed to baseline migrations:', error);
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
    
    // Try normal migration deployment first
    console.log('[MIGRATION] Attempting normal migration deployment...');
    await executeCommand('npx prisma migrate deploy');
    
    console.log('[MIGRATION] ✅ Migration deployment successful!');
    return true;
    
  } catch (firstError) {
    console.log('[MIGRATION] Initial migration deployment failed');
    console.log('[MIGRATION] Error details:', firstError.stderr || firstError.error?.message);
    
    // Check if this is the P3005 error
    if (isP3005Error(firstError.stderr || firstError.error?.message || '')) {
      console.log('[MIGRATION] Detected P3005 error - attempting to baseline existing database...');
      
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
          throw retryError;
        }
      } else {
        console.error('[MIGRATION] ❌ Failed to baseline existing migrations');
        throw firstError;
      }
    } else {
      console.error('[MIGRATION] ❌ Migration deployment failed with non-P3005 error:', firstError);
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

module.exports = { deployMigrations, baselineExistingMigrations };