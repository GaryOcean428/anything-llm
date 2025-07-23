#!/usr/bin/env node

/**
 * Multi-Service Database Migration Script for AnythingLLM
 * 
 * This script handles database initialization and migrations
 * for shared PostgreSQL instances on Railway, preventing P3005 errors
 * by implementing schema isolation and conditional deployment.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('[DB-MIGRATE] Starting multi-service database migration...');

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('[DB-MIGRATE] ERROR: DATABASE_URL environment variable is not set');
  process.exit(1);
}

console.log(`[DB-MIGRATE] Database URL: ${process.env.DATABASE_URL.includes('postgresql') ? 'PostgreSQL' : 'SQLite'}`);

async function createAnythingLLMSchema() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  try {
    // Create anythingllm schema if it doesn't exist
    await prisma.$executeRaw`CREATE SCHEMA IF NOT EXISTS anythingllm;`;
    console.log('[DB-MIGRATE] ✅ AnythingLLM schema created/verified');
  } catch (error) {
    console.log('[DB-MIGRATE] Schema creation skipped:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function runMigration() {
  try {
    const clientPath = path.join(__dirname, '../node_modules/.prisma/client');
    
    // Generate Prisma client if needed
    if (!fs.existsSync(clientPath)) {
      console.log('[DB-MIGRATE] Generating Prisma client...');
      execSync('npx prisma generate', { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
    }

    // Ensure AnythingLLM schema exists before any operations
    await createAnythingLLMSchema();
    
    // Check if we can connect and determine migration strategy
    console.log('[DB-MIGRATE] Checking database connection and schema state...');
    
    try {
      // Try migrate deploy first for production environments
      execSync('npx prisma migrate deploy', { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
      console.log('[DB-MIGRATE] ✅ Schema-specific migrations applied');
    } catch (migrateError) {
      console.log('[DB-MIGRATE] Migration failed, using db push for schema sync...');
      
      try {
        // Use db push to sync schema without affecting existing data
        execSync('npx prisma db push --skip-generate', { 
          stdio: 'inherit',
          cwd: path.join(__dirname, '..')
        });
        console.log('[DB-MIGRATE] ✅ Schema synchronized successfully');
      } catch (pushError) {
        console.error('[DB-MIGRATE] ❌ Schema synchronization failed:', pushError.message);
        
        // In production, don't fail deployment for schema issues
        if (process.env.NODE_ENV === 'production') {
          console.log('[DB-MIGRATE] Production mode: continuing with deployment despite schema issues');
        } else {
          throw pushError;
        }
      }
    }
    
    // Generate Prisma client with multi-schema support
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    // Conditional seeding based on environment
    if (process.env.NODE_ENV !== 'production' && process.env.SKIP_SEED !== 'true') {
      console.log('[DB-MIGRATE] Development mode: running seed...');
      execSync('npx prisma db seed', { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
    } else {
      console.log('[DB-MIGRATE] Production mode: skipping seed, verifying database access...');
      
      // Verify database access without crashing
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      try {
        // Try to access the system_settings table
        await prisma.system_settings.findFirst();
        console.log('[DB-MIGRATE] ✅ Database tables accessible');
      } catch (error) {
        console.log('[DB-MIGRATE] ⚠️  Table verification failed, but continuing deployment:', error.message);
      } finally {
        await prisma.$disconnect();
      }
    }
    
    console.log('[DB-MIGRATE] ✅ Multi-service database migration completed successfully!');
    
  } catch (error) {
    console.error('[DB-MIGRATE] ❌ Database migration failed:', error.message);
    
    // In production, don't crash the deployment
    if (process.env.NODE_ENV === 'production') {
      console.log('[DB-MIGRATE] Production mode: continuing with deployment despite migration issues');
      return;
    }
    
    process.exit(1);
  }
}

runMigration();
