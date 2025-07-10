#!/usr/bin/env node

/**
 * Simple performance monitoring script for AnythingLLM
 * Collects basic metrics about the application
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function collectMetrics() {
  const metrics = {
    timestamp: new Date().toISOString(),
    node_version: process.version,
    memory_usage: process.memoryUsage(),
    uptime: process.uptime(),
    bundle_sizes: {},
    dependency_count: 0,
    vulnerability_count: 0
  };

  // Check bundle sizes if built
  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
  if (fs.existsSync(frontendDist)) {
    try {
      const assetsDir = path.join(frontendDist, 'assets');
      if (fs.existsSync(assetsDir)) {
        const files = fs.readdirSync(assetsDir);
        files.forEach(file => {
          const filePath = path.join(assetsDir, file);
          const stats = fs.statSync(filePath);
          metrics.bundle_sizes[file] = stats.size;
        });
      }
    } catch (error) {
      console.warn('Could not analyze bundle sizes:', error.message);
    }
  }

  // Count dependencies
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    metrics.dependency_count = Object.keys(packageJson.dependencies || {}).length + 
                              Object.keys(packageJson.devDependencies || {}).length;
  } catch (error) {
    console.warn('Could not count dependencies:', error.message);
  }

  // Check for vulnerabilities (simplified)
  try {
    execSync('yarn audit --level high', { stdio: 'pipe' });
    metrics.vulnerability_count = 0;
  } catch (error) {
    // If audit fails, there might be vulnerabilities
    metrics.vulnerability_count = 'unknown';
  }

  return metrics;
}

function saveMetrics(metrics) {
  const metricsDir = path.join(__dirname, '..', 'storage', 'metrics');
  if (!fs.existsSync(metricsDir)) {
    fs.mkdirSync(metricsDir, { recursive: true });
  }

  const filename = `metrics-${new Date().toISOString().split('T')[0]}.json`;
  const filepath = path.join(metricsDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(metrics, null, 2));
  console.log(`Metrics saved to ${filepath}`);
}

// Export functions for ES modules
export { collectMetrics, saveMetrics };

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  const metrics = collectMetrics();
  console.log('Performance Metrics:');
  console.log(JSON.stringify(metrics, null, 2));
  
  // Save metrics if storage directory exists
  const storageDir = path.join(__dirname, '..', 'storage');
  if (fs.existsSync(storageDir)) {
    saveMetrics(metrics);
  }
}