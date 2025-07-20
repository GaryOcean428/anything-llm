#!/usr/bin/env node

/**
 * Enhanced startup script with comprehensive environment variable setup
 * 
 * This script ensures all required environment variables are set before 
 * starting the application, preventing 500 errors from missing JWT_SECRET
 * or other critical configuration.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('[STARTUP] Checking and setting up environment variables...');

// Define required environment variables with their default generators
const requiredEnvVars = {
  NODE_ENV: process.env.NODE_ENV || 'production',
  PORT: process.env.PORT || process.env.SERVER_PORT || '3001',
  SERVER_PORT: process.env.SERVER_PORT || process.env.PORT || '3001',
  
  // Security variables - generate if not present
  JWT_SECRET: process.env.JWT_SECRET || (() => {
    console.log('[STARTUP] Generating JWT_SECRET...');
    return `anything-llm-jwt-${crypto.randomBytes(32).toString('hex')}`;
  })(),
  
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || (() => {
    console.log('[STARTUP] Generating ENCRYPTION_KEY...');
    return crypto.randomBytes(16).toString('hex');
  })(),
  
  SIG_KEY: process.env.SIG_KEY || (() => {
    console.log('[STARTUP] Generating SIG_KEY...');
    return `anything-llm-sig-${crypto.randomBytes(32).toString('hex')}`;
  })(),
  
  SIG_SALT: process.env.SIG_SALT || (() => {
    console.log('[STARTUP] Generating SIG_SALT...');
    return `anything-llm-salt-${crypto.randomBytes(16).toString('hex')}`;
  })(),
  
  // Storage and feature configuration
  STORAGE_DIR: process.env.STORAGE_DIR || path.join(__dirname, 'storage'),
  VECTOR_DB: process.env.VECTOR_DB || 'lancedb',
  WHISPER_PROVIDER: process.env.WHISPER_PROVIDER || 'local',
  TTS_PROVIDER: process.env.TTS_PROVIDER || 'native',
  DISABLE_TELEMETRY: process.env.DISABLE_TELEMETRY || 'false'
};

// Set all environment variables
for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!process.env[key]) {
    process.env[key] = value;
    console.log(`[STARTUP] Set ${key}=${key.includes('SECRET') || key.includes('KEY') || key.includes('SALT') ? '***' : value}`);
  }
}

// Verify critical environment variables are now set
const criticalVars = ['DATABASE_URL', 'JWT_SECRET', 'ENCRYPTION_KEY'];
const missing = criticalVars.filter(varName => !process.env[varName]);

if (missing.length > 0) {
  console.error('[STARTUP] ❌ Missing critical environment variables:', missing);
  console.error('[STARTUP] Please ensure these are set before starting the application.');
  process.exit(1);
}

console.log('[STARTUP] ✅ All required environment variables are set');
console.log(`[STARTUP] Environment: ${process.env.NODE_ENV}`);
console.log(`[STARTUP] Server will start on port: ${process.env.PORT}`);

// Test JWT token generation to ensure it works
try {
  const jwt = require('jsonwebtoken');
  const testToken = jwt.sign({ test: 'startup' }, process.env.JWT_SECRET, { expiresIn: '1m' });
  
  if (testToken) {
    console.log('[STARTUP] ✅ JWT token generation test successful');
  }
} catch (error) {
  console.error('[STARTUP] ❌ JWT token generation test failed:', error.message);
  process.exit(1);
}

console.log('[STARTUP] Starting application...');

// Now start the main application
require('./index.js');