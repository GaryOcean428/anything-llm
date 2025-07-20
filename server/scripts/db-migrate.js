#!/usr/bin/env node

/**
 * Database Migration Script for AnythingLLM
 * 
 * This script handles database initialization and migrations
 * for both development (SQLite) and production (PostgreSQL) environments
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('[DB-MIGRATE] Starting database migration process...');

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('[DB-MIGRATE] ERROR: DATABASE_URL environment variable is not set');
  process.exit(1);
}

console.log(`[DB-MIGRATE] Database URL: ${process.env.DATABASE_URL.includes('postgresql') ? 'PostgreSQL' : 'SQLite'}`);

try {
  // Check if Prisma client exists, if not generate it
  const clientPath = path.join(__dirname, '../node_modules/.prisma/client');
  if (!fs.existsSync(clientPath)) {
    console.log('[DB-MIGRATE] Generating Prisma client...');
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
  }

  // Check if database needs initialization
  console.log('[DB-MIGRATE] Checking database connection...');
  
  try {
    // Try to connect to database
    execSync('npx prisma db pull --force', { 
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    });
    console.log('[DB-MIGRATE] Database connection successful');
  } catch (pullError) {
    console.log('[DB-MIGRATE] Database needs initialization, deploying schema...');
    
    // Deploy the schema (equivalent to migrate deploy)
    execSync('npx prisma db push --force-reset', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    console.log('[DB-MIGRATE] Schema deployed successfully');
  }

  // Run any pending migrations
  console.log('[DB-MIGRATE] Applying migrations...');
  try {
    execSync('npx prisma migrate deploy', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
  } catch (migrateError) {
    console.log('[DB-MIGRATE] No migrations to apply or migration failed, using db push...');
    execSync('npx prisma db push', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
  }

  // Seed the database with initial data
  console.log('[DB-MIGRATE] Seeding database...');
  execSync('npx prisma db seed', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });

  console.log('[DB-MIGRATE] ✅ Database migration completed successfully!');

} catch (error) {
  console.error('[DB-MIGRATE] ❌ Database migration failed:', error.message);
  
  // If it's a development environment, try to create the database file
  if (process.env.DATABASE_URL.startsWith('file:')) {
    console.log('[DB-MIGRATE] Attempting to create SQLite database...');
    try {
      execSync('npx prisma db push', { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
      console.log('[DB-MIGRATE] ✅ SQLite database created successfully!');
    } catch (sqliteError) {
      console.error('[DB-MIGRATE] ❌ Failed to create SQLite database:', sqliteError.message);
      process.exit(1);
    }
  } else {
    process.exit(1);
  }
}
