#!/usr/bin/env node

/**
 * Railway Schema Fix Validation Script
 * 
 * This script validates that the Prisma schema migration fix
 * is properly set up for Railway deployments.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Railway Schema Fix Validation');
console.log('==================================');

let allPassed = true;

function checkPassed(name, condition, message = '') {
  const status = condition ? '✅' : '❌';
  console.log(`${status} ${name}`);
  if (!condition) {
    allPassed = false;
    if (message) console.log(`   ${message}`);
  }
  return condition;
}

// Check 1: Migration files exist
console.log('\n📁 Migration Files:');
const migrationDir = path.join(__dirname, '..', 'server', 'prisma', 'migrations');
const railwayFixExists = fs.existsSync(path.join(migrationDir, '20250731215000_railway_schema_fix', 'migration.sql'));
checkPassed('Railway schema fix migration exists', railwayFixExists, 'Missing 20250731215000_railway_schema_fix migration');

const schemaAwareExists = fs.existsSync(path.join(migrationDir, '20250731054850_schema_aware_migration', 'migration.sql'));
checkPassed('Schema aware migration exists', schemaAwareExists, 'Missing schema aware migration');

// Check 2: Migration scripts
console.log('\n🔧 Migration Scripts:');
const migrateDeployExists = fs.existsSync(path.join(__dirname, '..', 'server', 'scripts', 'migrate-deploy.js'));
checkPassed('Enhanced migrate-deploy.js exists', migrateDeployExists);

const dbMigrateExists = fs.existsSync(path.join(__dirname, '..', 'server', 'scripts', 'db-migrate.js'));
checkPassed('Enhanced db-migrate.js exists', dbMigrateExists);

if (migrateDeployExists) {
  const migrateDeployContent = fs.readFileSync(path.join(__dirname, '..', 'server', 'scripts', 'migrate-deploy.js'), 'utf8');
  checkPassed('Migrate deploy has schema verification', migrateDeployContent.includes('verifySchemaDeployment'));
  checkPassed('Migrate deploy has search_path config', migrateDeployContent.includes('search_path=anythingllm,public'));
}

// Check 3: Railway configuration
console.log('\n🚂 Railway Configuration:');
const railwayConfigExists = fs.existsSync(path.join(__dirname, '..', 'railway.json'));
checkPassed('Railway.json exists', railwayConfigExists);

if (railwayConfigExists) {
  const railwayConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'railway.json'), 'utf8'));
  const usesEnhancedScript = railwayConfig.deploy?.startCommand?.includes('migrate-deploy.js');
  checkPassed('Railway config uses enhanced migration script', usesEnhancedScript, 'Should use node scripts/migrate-deploy.js');
}

// Check 4: Prisma schema
console.log('\n📋 Prisma Schema:');
const schemaExists = fs.existsSync(path.join(__dirname, '..', 'server', 'prisma', 'schema.prisma'));
checkPassed('Prisma schema exists', schemaExists);

if (schemaExists) {
  const schemaContent = fs.readFileSync(path.join(__dirname, '..', 'server', 'prisma', 'schema.prisma'), 'utf8');
  checkPassed('Schema uses multi-schema setup', schemaContent.includes('schemas  = ["public", "anythingllm"]'));
  checkPassed('Models use anythingllm schema', schemaContent.includes('@@schema("anythingllm")'));
  checkPassed('Workspaces model exists', schemaContent.includes('model workspaces'));
  checkPassed('System settings model exists', schemaContent.includes('model system_settings'));
  checkPassed('Event logs model exists', schemaContent.includes('model event_logs'));
}

// Check 5: Package.json scripts
console.log('\n📦 Package.json Scripts:');
const packageJsonExists = fs.existsSync(path.join(__dirname, '..', 'server', 'package.json'));
checkPassed('Server package.json exists', packageJsonExists);

if (packageJsonExists) {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'server', 'package.json'), 'utf8'));
  checkPassed('Has migrate:deploy script', packageJson.scripts?.['migrate:deploy']);
  checkPassed('Has start:migrate script', packageJson.scripts?.['start:migrate']);
  checkPassed('Has db:migrate script', packageJson.scripts?.['db:migrate']);
}

// Check 6: Migration SQL content
console.log('\n📄 Migration Content:');
if (railwayFixExists) {
  const migrationContent = fs.readFileSync(path.join(migrationDir, '20250731215000_railway_schema_fix', 'migration.sql'), 'utf8');
  checkPassed('Creates anythingllm schema', migrationContent.includes('CREATE SCHEMA IF NOT EXISTS anythingllm'));
  checkPassed('Creates workspaces table', migrationContent.includes('CREATE TABLE IF NOT EXISTS anythingllm.workspaces'));
  checkPassed('Creates system_settings table', migrationContent.includes('CREATE TABLE IF NOT EXISTS anythingllm.system_settings'));
  checkPassed('Creates event_logs table', migrationContent.includes('CREATE TABLE IF NOT EXISTS anythingllm.event_logs'));
  checkPassed('Handles table moving', migrationContent.includes('ensure_table_in_anythingllm_schema'));
}

// Summary
console.log('\n🎯 Summary:');
if (allPassed) {
  console.log('✅ All validation checks passed!');
  console.log('🚀 Railway deployment should work correctly with the schema fix.');
  console.log('');
  console.log('Next steps:');
  console.log('1. Deploy to Railway');
  console.log('2. Monitor deployment logs for schema migration messages');
  console.log('3. Verify application can access tables in anythingllm schema');
} else {
  console.log('❌ Some validation checks failed.');
  console.log('Please fix the issues above before deploying to Railway.');
}

process.exit(allPassed ? 0 : 1);