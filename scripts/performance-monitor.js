#!/usr/bin/env node

/**
 * Enhanced performance monitoring script for AnythingLLM
 * Part of Comprehensive QA & System Optimization Initiative
 * Collects detailed metrics about the application performance
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeCodebase() {
  const analysis = {
    file_counts: {},
    line_counts: {},
    size_analysis: {}
  };

  try {
    // Count different file types
    const jsFiles = execSync('find . -name "*.js" -not -path "./node_modules/*" | wc -l', { encoding: 'utf8' }).trim();
    const tsFiles = execSync('find . -name "*.ts" -not -path "./node_modules/*" | wc -l', { encoding: 'utf8' }).trim();
    const jsxFiles = execSync('find . -name "*.jsx" -not -path "./node_modules/*" | wc -l', { encoding: 'utf8' }).trim();
    const tsxFiles = execSync('find . -name "*.tsx" -not -path "./node_modules/*" | wc -l', { encoding: 'utf8' }).trim();

    analysis.file_counts = {
      javascript: parseInt(jsFiles),
      typescript: parseInt(tsFiles),
      react_jsx: parseInt(jsxFiles),
      react_tsx: parseInt(tsxFiles)
    };

    // Line count analysis
    const totalLines = execSync('find . -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" | grep -v node_modules | xargs wc -l | tail -1', { encoding: 'utf8' });
    analysis.line_counts.total = totalLines.trim().split(' ')[0];

    // Repository size analysis
    const repoSize = execSync('du -sh . | cut -f1', { encoding: 'utf8' }).trim();
    const nodeModulesSize = execSync('du -sh node_modules 2>/dev/null | cut -f1 || echo "0"', { encoding: 'utf8' }).trim();
    
    analysis.size_analysis = {
      repository_size: repoSize,
      node_modules_size: nodeModulesSize
    };

  } catch (error) {
    console.warn('Error analyzing codebase:', error.message);
  }

  return analysis;
}

function analyzeTestCoverage() {
  const coverage = {
    has_tests: false,
    test_files: 0,
    coverage_threshold: null
  };

  try {
    // Check for test files
    const testFiles = execSync('find . -name "*.test.*" -o -name "*.spec.*" | grep -v node_modules | wc -l', { encoding: 'utf8' }).trim();
    coverage.test_files = parseInt(testFiles);
    coverage.has_tests = coverage.test_files > 0;

    // Check vitest config for coverage thresholds
    const vitestConfigPath = path.join(__dirname, '..', 'vitest.config.js');
    if (fs.existsSync(vitestConfigPath)) {
      const config = fs.readFileSync(vitestConfigPath, 'utf8');
      const thresholdMatch = config.match(/threshold:\s*{\s*global:\s*{[^}]*}/);
      if (thresholdMatch) {
        coverage.coverage_threshold = 'configured';
      }
    }
  } catch (error) {
    console.warn('Error analyzing test coverage:', error.message);
  }

  return coverage;
}

function analyzeDependencies() {
  const dependencies = {
    total: 0,
    production: 0,
    development: 0,
    outdated: [],
    vulnerabilities: {
      total: 0,
      high: 0,
      moderate: 0,
      low: 0
    }
  };

  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    dependencies.production = Object.keys(packageJson.dependencies || {}).length;
    dependencies.development = Object.keys(packageJson.devDependencies || {}).length;
    dependencies.total = dependencies.production + dependencies.development;

    // Check for outdated packages
    try {
      const outdated = execSync('npm outdated --json', { encoding: 'utf8' });
      const outdatedPackages = JSON.parse(outdated);
      dependencies.outdated = Object.keys(outdatedPackages);
    } catch (error) {
      // No outdated packages or error running command
      dependencies.outdated = [];
    }

    // Simplified vulnerability check
    try {
      const auditOutput = execSync('npm audit --json', { encoding: 'utf8' });
      const audit = JSON.parse(auditOutput);
      if (audit.vulnerabilities) {
        for (const [pkg, vuln] of Object.entries(audit.vulnerabilities)) {
          dependencies.vulnerabilities.total++;
          if (vuln.severity === 'high' || vuln.severity === 'critical') {
            dependencies.vulnerabilities.high++;
          } else if (vuln.severity === 'moderate') {
            dependencies.vulnerabilities.moderate++;
          } else {
            dependencies.vulnerabilities.low++;
          }
        }
      }
    } catch (error) {
      // Audit might fail but that doesn't mean there are no vulnerabilities
      dependencies.vulnerabilities = { total: 'unknown', note: 'Could not run audit' };
    }

  } catch (error) {
    console.warn('Error analyzing dependencies:', error.message);
  }

  return dependencies;
}

function analyzeBundleSize() {
  const bundleAnalysis = {
    frontend_built: false,
    assets: {},
    total_size: 0,
    gzip_estimated: {}
  };

  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
  if (fs.existsSync(frontendDist)) {
    bundleAnalysis.frontend_built = true;
    
    try {
      const assetsDir = path.join(frontendDist, 'assets');
      if (fs.existsSync(assetsDir)) {
        const files = fs.readdirSync(assetsDir);
        files.forEach(file => {
          const filePath = path.join(assetsDir, file);
          const stats = fs.statSync(filePath);
          bundleAnalysis.assets[file] = {
            size: stats.size,
            size_formatted: formatBytes(stats.size)
          };
          bundleAnalysis.total_size += stats.size;
          
          // Estimate gzip size (roughly 30% of original for typical JS/CSS)
          bundleAnalysis.gzip_estimated[file] = {
            size: Math.round(stats.size * 0.3),
            size_formatted: formatBytes(Math.round(stats.size * 0.3))
          };
        });
      }

      // Check for bundle analysis files
      const bundleReportPath = path.join(frontendDist, 'bundleinspector.html');
      bundleAnalysis.has_analysis_report = fs.existsSync(bundleReportPath);

    } catch (error) {
      console.warn('Could not analyze bundle sizes:', error.message);
    }
  }

  return bundleAnalysis;
}

function collectMetrics() {
  console.log('🔍 Collecting performance metrics...\n');
  
  const metrics = {
    timestamp: new Date().toISOString(),
    system: {
      node_version: process.version,
      memory_usage: process.memoryUsage(),
      uptime: process.uptime(),
      platform: process.platform,
      arch: process.arch
    },
    codebase: analyzeCodebase(),
    testing: analyzeTestCoverage(),
    dependencies: analyzeDependencies(),
    bundle: analyzeBundleSize()
  };

  return metrics;
}

function generateReport(metrics) {
  console.log('📊 PERFORMANCE ANALYSIS REPORT');
  console.log('================================\n');

  // System Info
  console.log('🖥️  SYSTEM INFORMATION');
  console.log(`   Node.js: ${metrics.system.node_version}`);
  console.log(`   Platform: ${metrics.system.platform} (${metrics.system.arch})`);
  console.log(`   Memory: ${formatBytes(metrics.system.memory_usage.heapUsed)} / ${formatBytes(metrics.system.memory_usage.heapTotal)}`);
  console.log(`   Uptime: ${Math.round(metrics.system.uptime)} seconds\n`);

  // Codebase Analysis
  console.log('📁 CODEBASE ANALYSIS');
  console.log(`   Repository Size: ${metrics.codebase.size_analysis.repository_size}`);
  console.log(`   Node Modules: ${metrics.codebase.size_analysis.node_modules_size}`);
  console.log(`   Total Lines: ${metrics.codebase.line_counts.total || 'N/A'}`);
  console.log('   File Breakdown:');
  console.log(`     JavaScript: ${metrics.codebase.file_counts.javascript}`);
  console.log(`     TypeScript: ${metrics.codebase.file_counts.typescript}`);
  console.log(`     React JSX: ${metrics.codebase.file_counts.react_jsx}`);
  console.log(`     React TSX: ${metrics.codebase.file_counts.react_tsx}\n`);

  // Dependencies
  console.log('📦 DEPENDENCY ANALYSIS');
  console.log(`   Total Dependencies: ${metrics.dependencies.total}`);
  console.log(`   Production: ${metrics.dependencies.production}`);
  console.log(`   Development: ${metrics.dependencies.development}`);
  console.log(`   Outdated: ${metrics.dependencies.outdated.length}`);
  if (typeof metrics.dependencies.vulnerabilities.total === 'number') {
    console.log(`   Vulnerabilities: ${metrics.dependencies.vulnerabilities.total} (H:${metrics.dependencies.vulnerabilities.high} M:${metrics.dependencies.vulnerabilities.moderate} L:${metrics.dependencies.vulnerabilities.low})`);
  } else {
    console.log(`   Vulnerabilities: ${metrics.dependencies.vulnerabilities.total}`);
  }
  console.log('');

  // Testing
  console.log('🧪 TESTING ANALYSIS');
  console.log(`   Has Tests: ${metrics.testing.has_tests ? '✅' : '❌'}`);
  console.log(`   Test Files: ${metrics.testing.test_files}`);
  console.log(`   Coverage Config: ${metrics.testing.coverage_threshold ? '✅' : '❌'}\n`);

  // Bundle Analysis
  console.log('📦 BUNDLE ANALYSIS');
  console.log(`   Frontend Built: ${metrics.bundle.frontend_built ? '✅' : '❌'}`);
  if (metrics.bundle.frontend_built) {
    console.log(`   Total Bundle Size: ${formatBytes(metrics.bundle.total_size)}`);
    console.log(`   Analysis Report: ${metrics.bundle.has_analysis_report ? '✅' : '❌'}`);
    console.log('   Asset Breakdown:');
    for (const [filename, info] of Object.entries(metrics.bundle.assets)) {
      console.log(`     ${filename}: ${info.size_formatted} (est. gzip: ${metrics.bundle.gzip_estimated[filename]?.size_formatted})`);
    }
  }
  console.log('');

  // Recommendations
  console.log('💡 OPTIMIZATION RECOMMENDATIONS');
  const recommendations = [];
  
  if (!metrics.testing.has_tests) {
    recommendations.push('❗ Add test coverage to improve code quality');
  }
  if (metrics.dependencies.outdated.length > 0) {
    recommendations.push(`📦 Update ${metrics.dependencies.outdated.length} outdated dependencies`);
  }
  if (typeof metrics.dependencies.vulnerabilities.total === 'number' && metrics.dependencies.vulnerabilities.total > 0) {
    recommendations.push(`🔒 Fix ${metrics.dependencies.vulnerabilities.total} security vulnerabilities`);
  }
  if (metrics.bundle.total_size > 1000000) { // > 1MB
    recommendations.push('📦 Consider bundle size optimization (>1MB total)');
  }
  if (!metrics.bundle.has_analysis_report) {
    recommendations.push('📊 Run bundle analysis to identify optimization opportunities');
  }

  if (recommendations.length === 0) {
    console.log('   ✅ No immediate optimization opportunities identified');
  } else {
    recommendations.forEach(rec => console.log(`   ${rec}`));
  }
  console.log('');
}

function saveMetrics(metrics) {
  const metricsDir = path.join(__dirname, '..', 'reports');
  if (!fs.existsSync(metricsDir)) {
    fs.mkdirSync(metricsDir, { recursive: true });
  }

  const filename = `performance-metrics-${new Date().toISOString().split('T')[0]}.json`;
  const filepath = path.join(metricsDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(metrics, null, 2));
  console.log(`📄 Detailed metrics saved to ${filepath}`);
}

// Export functions for ES modules
export { collectMetrics, saveMetrics, generateReport };

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  const metrics = collectMetrics();
  generateReport(metrics);
  saveMetrics(metrics);
}