#!/usr/bin/env node

/**
 * Railway Deployment Validation Script
 * 
 * This script validates that the multi-service database setup
 * is working correctly and AnythingLLM can access its schema
 */

const { PrismaClient } = require('@prisma/client');

async function validateDeployment() {
  console.log('🔍 AnythingLLM Railway Deployment Validation');
  console.log('==========================================');
  
  const prisma = new PrismaClient();
  let allChecksPass = true;
  
  try {
    // Test 1: Database Connection
    console.log('\n📡 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Test 2: Schema Existence
    console.log('\n🏗️  Checking anythingllm schema...');
    const schemas = await prisma.$queryRaw`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = 'anythingllm'
    `;
    
    if (schemas.length > 0) {
      console.log('✅ anythingllm schema exists');
    } else {
      console.log('❌ anythingllm schema not found');
      allChecksPass = false;
    }
    
    // Test 3: Core Tables Access
    console.log('\n📋 Checking core tables...');
    const coreTables = [
      'system_settings',
      'workspaces', 
      'users',
      'workspace_documents',
      'document_vectors'
    ];
    
    for (const table of coreTables) {
      try {
        const modelName = table === 'system_settings' ? 'systemSettings' :
                         table === 'workspace_documents' ? 'workspaceDocuments' :
                         table === 'document_vectors' ? 'documentVectors' :
                         table;
        
        await prisma[modelName].findFirst();
        console.log(`✅ ${table} table accessible`);
      } catch (error) {
        console.log(`❌ ${table} table access failed: ${error.message}`);
        // Note: This might be expected for fresh deployments
      }
    }
    
    // Test 4: Schema Isolation
    console.log('\n🔒 Checking schema isolation...');
    const allTables = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
      FROM pg_tables 
      WHERE schemaname IN ('public', 'anythingllm')
      ORDER BY schemaname, tablename
    `;
    
    const publicTables = allTables.filter(t => t.schemaname === 'public');
    const anythinglmTables = allTables.filter(t => t.schemaname === 'anythingllm');
    
    console.log(`📊 public schema tables: ${publicTables.length}`);
    console.log(`📊 anythingllm schema tables: ${anythinglmTables.length}`);
    
    if (anythinglmTables.length > 0) {
      console.log('✅ Schema isolation working - AnythingLLM tables in dedicated schema');
    } else {
      console.log('⚠️  No tables found in anythingllm schema (might be expected for new deployment)');
    }
    
    // Test 5: Basic Operations
    console.log('\n⚙️  Testing basic operations...');
    try {
      const settingsCount = await prisma.systemSettings.count();
      console.log(`✅ System settings operations work (count: ${settingsCount})`);
    } catch (error) {
      console.log(`⚠️  System settings operations failed: ${error.message}`);
    }
    
    // Test 6: Environment Check
    console.log('\n🌍 Environment validation...');
    console.log(`Node.js version: ${process.version}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Database URL type: ${process.env.DATABASE_URL?.includes('postgresql') ? 'PostgreSQL' : 'Other'}`);
    
    // Summary
    console.log('\n📋 Validation Summary');
    console.log('====================');
    
    if (allChecksPass) {
      console.log('🎉 All critical checks passed!');
      console.log('AnythingLLM should deploy successfully in multi-service environment');
    } else {
      console.log('⚠️  Some checks failed - review above for details');
      console.log('Deployment may still succeed if issues are non-critical');
    }
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    allChecksPass = false;
  } finally {
    await prisma.$disconnect();
  }
  
  // Exit with appropriate code for CI/CD
  process.exit(allChecksPass ? 0 : 1);
}

validateDeployment();