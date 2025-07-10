/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        'node_modules/',
        'coverage/',
        '**/*.test.js',
        '**/*.spec.js',
        '**/test/**',
        '**/tests/**',
        '**/build/**',
        '**/dist/**',
        '**/storage/**',
        '**/documents/**',
        '**/vector-cache/**',
        '**/*.config.js',
        '**/*.config.ts'
      ],
      threshold: {
        global: {
          branches: 60,  // Starting with lower threshold, will increase
          functions: 60,
          lines: 60,
          statements: 60
        }
      }
    },
    include: [
      '__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.idea/**',
      '**/.git/**',
      '**/.cache/**',
      '**/storage/**',
      '**/documents/**',
      '**/vector-cache/**',
      'server/__tests__/**'  // Temporarily exclude until Prisma is fixed
    ]
  }
})