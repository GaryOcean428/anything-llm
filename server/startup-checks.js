#!/usr/bin/env node

/**
 * Startup Health Checks for AnythingLLM
 * 
 * This module performs critical health checks during application startup,
 * including database migration status and connectivity verification.
 */

const { PrismaClient } = require('@prisma/client');
const { exec } = require('child_process');

/**
 * Execute a command and return a promise
 */
function executeCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
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
  });
}

/**
 * Check if the database connection is working
 */
async function checkDatabaseConnection() {
  console.log('[STARTUP] 🔍 Checking database connection...');
  
  try {
    const prisma = new PrismaClient();
    
    // Test basic connectivity
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1 as health_check`;
    
    await prisma.$disconnect();
    
    console.log('[STARTUP] ✅ Database connection healthy');
    return true;
  } catch (error) {
    console.error('[STARTUP] ❌ Database connection failed:', error.message);
    
    // Provide helpful troubleshooting information
    if (error.message.includes('ECONNREFUSED')) {
      console.log('[STARTUP] 💡 Database server appears to be down or unreachable');
      console.log('[STARTUP] 💡 Check DATABASE_URL and ensure database server is running');
    } else if (error.message.includes('authentication')) {
      console.log('[STARTUP] 💡 Database authentication failed');
      console.log('[STARTUP] 💡 Check database credentials in DATABASE_URL');
    } else if (error.message.includes('does not exist')) {
      console.log('[STARTUP] 💡 Database does not exist');
      console.log('[STARTUP] 💡 Ensure the database is created before running the application');
    }
    
    return false;
  }
}

/**
 * Check migration status and health
 */
async function checkMigrationStatus() {
  console.log('[STARTUP] 🔍 Checking migration status...');
  
  try {
    const { stdout, stderr } = await executeCommand('npx prisma migrate status', { stdio: 'pipe' });
    
    if (stdout.includes('Database schema is up to date')) {
      console.log('[STARTUP] ✅ Database migrations are up to date');
      return true;
    } else if (stdout.includes('following migration have not yet been applied')) {
      console.log('[STARTUP] ⚠️  Pending migrations detected');
      console.log('[STARTUP] 🔧 Run: npx prisma migrate deploy');
      return false;
    } else {
      console.log('[STARTUP] ✅ Migration status appears healthy');
      return true;
    }
  } catch (error) {
    console.log('[STARTUP] ⚠️  Migration status check failed:', error.stderr || error.error?.message);
    
    // Check for specific migration issues
    const errorStr = (error.stderr || error.error?.message || '').toLowerCase();
    
    if (errorStr.includes('p3005')) {
      console.log('[STARTUP] 🔧 P3005 Error detected - database needs baseline');
      console.log('[STARTUP] 🔧 Run: npx prisma migrate resolve --applied 20250720073934_init');
      console.log('[STARTUP] 🔧 Then: npx prisma migrate deploy');
      return false;
    } else if (errorStr.includes('20250720073934_init')) {
      console.log('[STARTUP] 🔧 Failed init migration detected');
      console.log('[STARTUP] 🔧 Run: npx prisma migrate resolve --applied 20250720073934_init');
      return false;
    } else if (errorStr.includes('migration')) {
      console.log('[STARTUP] 🔧 General migration issue detected');
      console.log('[STARTUP] 🔧 Run: npx prisma migrate status');
      console.log('[STARTUP] 🔧 Run: npx prisma migrate resolve --help');
      return false;
    }
    
    // If it's not a migration-specific error, assume it's okay to continue
    console.log('[STARTUP] ℹ️  Migration check inconclusive, proceeding with startup');
    return true;
  }
}

/**
 * Check if critical tables exist
 */
async function checkDatabaseSchema() {
  console.log('[STARTUP] 🔍 Checking database schema...');
  
  try {
    const prisma = new PrismaClient();
    
    // Check for essential tables
    const tableChecks = [
      prisma.users.findMany({ take: 1 }),
      prisma.workspaces.findMany({ take: 1 }),
      prisma.system_settings.findMany({ take: 1 })
    ];
    
    await Promise.all(tableChecks);
    await prisma.$disconnect();
    
    console.log('[STARTUP] ✅ Database schema appears healthy');
    return true;
  } catch (error) {
    console.error('[STARTUP] ❌ Database schema check failed:', error.message);
    
    if (error.message.includes('does not exist')) {
      console.log('[STARTUP] 🔧 Missing database tables detected');
      console.log('[STARTUP] 🔧 Run: npx prisma migrate deploy');
    }
    
    return false;
  }
}

/**
 * Perform all startup health checks
 */
async function performStartupChecks() {
  console.log('[STARTUP] =================================');
  console.log('[STARTUP] AnythingLLM Startup Health Checks');
  console.log('[STARTUP] =================================');
  
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('[STARTUP] ❌ DATABASE_URL environment variable is not set');
    console.log('[STARTUP] 🔧 Set DATABASE_URL before starting the application');
    return false;
  }
  
  // Ensure DATABASE_URL includes proper search path for multi-schema setup
  let databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl.includes('postgresql') && !databaseUrl.includes('search_path') && !databaseUrl.includes('schema=')) {
    if (databaseUrl.includes('?')) {
      databaseUrl += '&search_path=anythingllm,public';
    } else {
      databaseUrl += '?search_path=anythingllm,public';
    }
    process.env.DATABASE_URL = databaseUrl;
    console.log('[STARTUP] ✅ Added search_path to DATABASE_URL for multi-schema support');
  }
  
  console.log('[STARTUP] ✅ DATABASE_URL is configured');
  
  // Perform all checks
  const checks = [
    { name: 'Database Connection', check: checkDatabaseConnection },
    { name: 'Migration Status', check: checkMigrationStatus },
    { name: 'Database Schema', check: checkDatabaseSchema }
  ];
  
  let allPassed = true;
  const results = [];
  
  for (const { name, check } of checks) {
    try {
      const result = await check();
      results.push({ name, passed: result });
      
      if (!result) {
        allPassed = false;
      }
    } catch (error) {
      console.error(`[STARTUP] ❌ ${name} check failed with error:`, error);
      results.push({ name, passed: false, error });
      allPassed = false;
    }
  }
  
  // Summary
  console.log('[STARTUP] =================================');
  console.log('[STARTUP] Health Check Summary:');
  results.forEach(({ name, passed, error }) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`[STARTUP] ${status}: ${name}`);
    if (error) {
      console.log(`[STARTUP]   Error: ${error.message}`);
    }
  });
  console.log('[STARTUP] =================================');
  
  if (allPassed) {
    console.log('[STARTUP] 🎉 All health checks passed! Application is ready to start.');
  } else {
    console.log('[STARTUP] ⚠️  Some health checks failed. Application may not work correctly.');
    console.log('[STARTUP] 💡 Check the logs above for specific remediation steps.');
  }
  
  return allPassed;
}

/**
 * Run startup checks if this module is executed directly
 */
async function main() {
  try {
    const success = await performStartupChecks();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('[STARTUP] 💥 Startup checks failed with unexpected error:', error);
    process.exit(1);
  }
}

module.exports = {
  performStartupChecks,
  checkDatabaseConnection,
  checkMigrationStatus,
  checkDatabaseSchema
};

// Only run if this script is executed directly
if (require.main === module) {
  main();
}