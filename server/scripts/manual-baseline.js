#!/usr/bin/env node

/**
 * Manual Prisma migration baseline script
 * 
 * Use this script to manually baseline your database when experiencing P3005 errors
 * This should only be used when the automatic fix in migrate-deploy.js doesn't work
 */

const { exec } = require('child_process');
const path = require('path');
const readline = require('readline');

// Change to server directory
process.chdir(path.join(__dirname, '..'));

console.log('====================================');
console.log('Manual Prisma Migration Baseline');
console.log('====================================');
console.log();

function executeCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command}`);
    
    const child = exec(command, (error, stdout, stderr) => {
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

async function listMigrations() {
  try {
    const { stdout } = await executeCommand('ls -la prisma/migrations/');
    console.log('Available migrations:');
    console.log(stdout);
    
    // Extract migration names
    const lines = stdout.split('\n');
    const migrations = [];
    
    for (const line of lines) {
      if (line.startsWith('d') && !line.includes('.')) {
        const parts = line.trim().split(/\s+/);
        const dirName = parts[parts.length - 1];
        if (dirName && dirName !== '.' && dirName !== '..' && dirName.length > 10) {
          migrations.push(dirName);
        }
      }
    }
    
    return migrations;
  } catch (error) {
    console.error('Error listing migrations:', error);
    return [];
  }
}

async function baselineMigration(migrationName) {
  try {
    console.log(`\nBaselining migration: ${migrationName}`);
    await executeCommand(`npx prisma migrate resolve --applied "${migrationName}"`);
    console.log('✅ Migration baselined successfully');
    return true;
  } catch (error) {
    console.error('❌ Error baselining migration:', error.stderr || error.error?.message);
    return false;
  }
}

async function checkMigrationStatus() {
  try {
    console.log('\nChecking current migration status...');
    await executeCommand('npx prisma migrate status');
  } catch (error) {
    console.log('Migration status check failed (this is expected with P3005 error)');
    console.log('Error:', error.stderr || error.error?.message);
  }
}

async function testMigrationDeploy() {
  try {
    console.log('\nTesting migration deployment...');
    await executeCommand('npx prisma migrate deploy');
    console.log('✅ Migration deployment successful!');
    return true;
  } catch (error) {
    console.error('❌ Migration deployment failed:', error.stderr || error.error?.message);
    return false;
  }
}

async function main() {
  console.log('This script helps you manually resolve Prisma P3005 errors.');
  console.log('It will baseline existing migrations so Prisma knows they have been applied.');
  console.log();
  
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.log('Please set your DATABASE_URL and try again.');
    console.log('Example: DATABASE_URL="postgresql://user:pass@host:port/db" node scripts/manual-baseline.js');
    process.exit(1);
  }
  
  console.log('✅ DATABASE_URL is set');
  console.log('Database:', process.env.DATABASE_URL.replace(/\/\/.*@/, '//***:***@'));
  console.log();
  
  // Show current migration status
  await checkMigrationStatus();
  console.log();
  
  // List available migrations
  const migrations = await listMigrations();
  
  if (migrations.length === 0) {
    console.error('❌ No migrations found in prisma/migrations/');
    process.exit(1);
  }
  
  console.log('\nFound migrations:');
  migrations.forEach((migration, index) => {
    console.log(`  ${index + 1}. ${migration}`);
  });
  
  console.log();
  const answer = await askQuestion('Do you want to baseline all these migrations? (y/N): ');
  
  if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
    console.log('Operation cancelled.');
    process.exit(0);
  }
  
  console.log('\n🔄 Starting baseline process...');
  
  // Baseline each migration
  let successCount = 0;
  for (const migration of migrations) {
    const success = await baselineMigration(migration);
    if (success) {
      successCount++;
    }
  }
  
  console.log(`\n📊 Baselined ${successCount}/${migrations.length} migrations`);
  
  if (successCount === migrations.length) {
    console.log('✅ All migrations baselined successfully!');
    
    // Test deployment
    console.log('\n🧪 Testing migration deployment...');
    const deploySuccess = await testMigrationDeploy();
    
    if (deploySuccess) {
      console.log('\n🎉 Success! Your database should now work with normal deployments.');
      console.log('You can now redeploy your Railway application.');
    } else {
      console.log('\n⚠️  Baseline successful but deployment test failed.');
      console.log('Please check your database connection and migration files.');
    }
  } else {
    console.log('\n❌ Some migrations failed to baseline.');
    console.log('Please check the errors above and try again.');
  }
}

main().catch(error => {
  console.error('\n💥 Script failed with error:', error);
  process.exit(1);
});