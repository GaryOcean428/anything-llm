#!/usr/bin/env node

/**
 * Automated Migration Recovery Commands
 * 
 * This script implements the recovery strategy commands from the failed migration analysis.
 * It provides automated execution of the recovery phases outlined in the issue.
 */

const { exec } = require('child_process');
const path = require('path');
const readline = require('readline');

// Change to server directory (we're already in server directory)
const currentDir = process.cwd();
console.log(`[RECOVERY] Running from directory: ${currentDir}`);

console.log('====================================');
console.log('Failed Migration Recovery System');
console.log('====================================');
console.log();

function executeCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`[RECOVERY] Executing: ${command}`);
    
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

    child.stdout?.on('data', (data) => process.stdout.write(data));
    child.stderr?.on('data', (data) => process.stderr.write(data));
  });
}

function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Phase 1: Migration State Assessment
 */
async function phase1_assessmentState() {
  console.log('\n📋 Phase 1: Migration State Assessment');
  console.log('=====================================');
  
  try {
    console.log('\n🔍 Checking current migration status...');
    await executeCommand('npx prisma migrate status');
    
    // Check for the specific failed migration
    console.log('\n🔍 Checking for 20250720073934_init migration...');
    const { stdout } = await executeCommand('ls -la prisma/migrations/', { stdio: 'pipe' });
    
    if (stdout.includes('20250720073934_init')) {
      console.log('✅ Found 20250720073934_init migration directory');
    } else {
      console.log('⚠️  20250720073934_init migration directory not found');
    }
    
    return true;
  } catch (error) {
    console.log('ℹ️  Migration status check completed (errors are expected for failed migrations)');
    console.log('Error details:', error.stderr || error.error?.message);
    return true; // Assessment can continue even with errors
  }
}

/**
 * Phase 2: Failed Migration Investigation  
 */
async function phase2_investigation() {
  console.log('\n🔍 Phase 2: Failed Migration Investigation');
  console.log('==========================================');
  
  try {
    console.log('\n📄 Examining failed migration content...');
    try {
      await executeCommand('cat prisma/migrations/20250720073934_init/migration.sql | head -20');
    } catch (error) {
      console.log('⚠️  Could not read migration file (this is expected if it doesn\'t exist)');
    }
    
    console.log('\n🏗️  Checking current database objects...');
    console.log('Note: This requires a valid DATABASE_URL connection');
    
    if (process.env.DATABASE_URL) {
      try {
        // Check tables using Prisma
        await executeCommand('npx prisma db pull --print | head -20');
      } catch (error) {
        console.log('⚠️  Could not check database objects:', error.stderr || error.error?.message);
      }
    } else {
      console.log('⚠️  DATABASE_URL not set, skipping database object check');
    }
    
    return true;
  } catch (error) {
    console.error('Investigation phase encountered issues:', error);
    return false;
  }
}

/**
 * Phase 3: Migration Resolution (Option A - Mark as Applied)
 */
async function phase3_optionA_markApplied() {
  console.log('\n✅ Phase 3A: Mark Migration as Applied');
  console.log('=====================================');
  
  try {
    console.log('\n🔧 Marking 20250720073934_init as applied...');
    await executeCommand('npx prisma migrate resolve --applied 20250720073934_init');
    
    console.log('\n📊 Verifying migration status...');
    await executeCommand('npx prisma migrate status');
    
    console.log('\n✅ Option A completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Option A failed:', error.stderr || error.error?.message);
    return false;
  }
}

/**
 * Phase 3: Migration Resolution (Option B - Rollback and Retry)
 */
async function phase3_optionB_rollbackRetry() {
  console.log('\n🔄 Phase 3B: Rollback and Retry');
  console.log('================================');
  
  try {
    console.log('\n🔧 Marking migration as rolled back...');
    await executeCommand('npx prisma migrate resolve --rolled-back 20250720073934_init');
    
    console.log('\n📦 Applying migrations again...');
    await executeCommand('npx prisma migrate deploy');
    
    console.log('\n✅ Option B completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Option B failed:', error.stderr || error.error?.message);
    return false;
  }
}

/**
 * Phase 4: Database Baseline Strategy
 */
async function phase4_baselineStrategy() {
  console.log('\n🏗️  Phase 4: Database Baseline Strategy');
  console.log('======================================');
  
  try {
    console.log('\n📥 Creating baseline from current database state...');
    await executeCommand('npx prisma db pull');
    
    console.log('\n🔧 Formatting schema...');
    await executeCommand('npx prisma format');
    
    console.log('\n✅ Marking migrations as applied...');
    await executeCommand('npx prisma migrate resolve --applied 20250720073934_init');
    
    console.log('\n✅ Phase 4 completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Phase 4 failed:', error.stderr || error.error?.message);
    return false;
  }
}

/**
 * Phase 5: Validate Recovery
 */
async function phase5_validateRecovery() {
  console.log('\n🧪 Phase 5: Validate Recovery');
  console.log('=============================');
  
  try {
    console.log('\n📊 Testing migration status...');
    await executeCommand('npx prisma migrate status');
    
    console.log('\n🔧 Generating Prisma client...');
    await executeCommand('npx prisma generate');
    
    console.log('\n🔗 Testing database connection...');
    // Use Node.js to test connection
    const testScript = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.$connect()
  .then(() => {
    console.log('✅ Database connection successful');
    return prisma.$disconnect();
  })
  .catch(e => {
    console.error('❌ Database connection failed:', e.message);
    process.exit(1);
  })
  .finally(() => process.exit(0));
    `;
    
    require('fs').writeFileSync('/tmp/db-test.js', testScript);
    await executeCommand('node /tmp/db-test.js');
    
    console.log('\n✅ Phase 5 validation completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Phase 5 validation failed:', error.stderr || error.error?.message);
    return false;
  }
}

/**
 * Main recovery workflow
 */
async function runRecoveryWorkflow() {
  console.log('🚀 Starting automated migration recovery workflow...');
  console.log('This implements the recovery strategy from the failed migration analysis.\n');
  
  // Check prerequisites
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    console.log('Please set DATABASE_URL and try again.');
    process.exit(1);
  }
  
  console.log('✅ DATABASE_URL is configured');
  console.log('Database:', process.env.DATABASE_URL.replace(/\/\/.*@/, '//***:***@'));
  
  // Execute phases
  const phases = [
    { name: 'Migration State Assessment', func: phase1_assessmentState },
    { name: 'Failed Migration Investigation', func: phase2_investigation },
  ];
  
  // Run assessment and investigation first
  for (const { name, func } of phases) {
    console.log(`\n🔄 Starting: ${name}`);
    const success = await func();
    if (!success) {
      console.error(`❌ ${name} failed. Stopping recovery workflow.`);
      process.exit(1);
    }
    console.log(`✅ ${name} completed`);
  }
  
  // Ask user which recovery option to use
  console.log('\n🤔 Choose recovery option:');
  console.log('  A) Mark migration as applied (recommended, preserves data)');
  console.log('  B) Rollback and retry (safe for development)');
  console.log('  C) Database baseline strategy (comprehensive approach)');
  console.log('  Q) Quit without changes');
  
  const choice = await askQuestion('\nEnter your choice (A/B/C/Q): ');
  
  let recoverySuccess = false;
  
  switch (choice.toUpperCase()) {
    case 'A':
      recoverySuccess = await phase3_optionA_markApplied();
      break;
    case 'B':
      recoverySuccess = await phase3_optionB_rollbackRetry();
      break;
    case 'C':
      recoverySuccess = await phase4_baselineStrategy();
      break;
    case 'Q':
      console.log('🚫 Recovery cancelled by user');
      process.exit(0);
      break;
    default:
      console.log('❌ Invalid choice');
      process.exit(1);
  }
  
  if (recoverySuccess) {
    console.log('\n🎯 Recovery option completed successfully!');
    
    // Always run validation
    const validationSuccess = await phase5_validateRecovery();
    
    if (validationSuccess) {
      console.log('\n🎉 Migration recovery completed successfully!');
      console.log('Your database should now work with normal deployments.');
      console.log('You can now restart your Railway application.');
    } else {
      console.log('\n⚠️  Recovery completed but validation failed.');
      console.log('Please check the errors above and consider manual intervention.');
    }
  } else {
    console.log('\n❌ Recovery failed. Please check the errors above.');
    console.log('You may need to try a different recovery option or manual intervention.');
    process.exit(1);
  }
}

/**
 * Quick recovery mode (tries Option A first)
 */
async function quickRecovery() {
  console.log('⚡ Quick Recovery Mode: Attempting Option A (Mark as Applied)');
  console.log('==============================================================');
  
  const success = await phase3_optionA_markApplied();
  
  if (success) {
    console.log('\n✅ Quick recovery successful!');
    await phase5_validateRecovery();
  } else {
    console.log('\n❌ Quick recovery failed. Run full recovery mode for more options.');
    process.exit(1);
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--quick') || args.includes('-q')) {
    await quickRecovery();
  } else if (args.includes('--help') || args.includes('-h')) {
    console.log('Failed Migration Recovery System');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/migration-recovery.js          # Full interactive recovery');
    console.log('  node scripts/migration-recovery.js --quick  # Quick recovery (Option A)');
    console.log('  node scripts/migration-recovery.js --help   # Show this help');
    console.log('');
    console.log('Recovery Options:');
    console.log('  A) Mark as Applied     - Mark 20250720073934_init as applied (preserves data)');
    console.log('  B) Rollback and Retry  - Mark as rolled back then redeploy (dev safe)');
    console.log('  C) Database Baseline   - Full baseline strategy (comprehensive)');
  } else {
    await runRecoveryWorkflow();
  }
}

main().catch(error => {
  console.error('\n💥 Recovery script failed with error:', error);
  process.exit(1);
});