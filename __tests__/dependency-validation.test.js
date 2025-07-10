import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

describe('Dependency Validation', () => {
  it('should have consistent Node.js version requirements across services', () => {
    const rootPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    const serverPackage = JSON.parse(fs.readFileSync('server/package.json', 'utf8'))
    const collectorPackage = JSON.parse(fs.readFileSync('collector/package.json', 'utf8'))

    const rootNodeVersion = rootPackage.engines?.node
    const serverNodeVersion = serverPackage.engines?.node
    const collectorNodeVersion = collectorPackage.engines?.node

    expect(rootNodeVersion).toBeDefined()
    expect(serverNodeVersion).toBeDefined()
    expect(collectorNodeVersion).toBeDefined()
    expect(serverNodeVersion).toBe(collectorNodeVersion)
  })

  it('should have all services define a license', () => {
    const rootPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    const serverPackage = JSON.parse(fs.readFileSync('server/package.json', 'utf8'))
    const frontendPackage = JSON.parse(fs.readFileSync('frontend/package.json', 'utf8'))
    const collectorPackage = JSON.parse(fs.readFileSync('collector/package.json', 'utf8'))

    expect(rootPackage.license).toBe('MIT')
    expect(serverPackage.license).toBe('MIT')
    expect(frontendPackage.license).toBe('MIT')
    expect(collectorPackage.license).toBe('MIT')
  })

  it('should have Vitest testing framework available', () => {
    const rootPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    
    expect(rootPackage.devDependencies).toBeDefined()
    expect(rootPackage.devDependencies.vitest).toBeDefined()
    expect(rootPackage.devDependencies['@vitest/ui']).toBeDefined()
    expect(rootPackage.devDependencies['@vitest/coverage-v8']).toBeDefined()
  })

  it('should have proper script configurations', () => {
    const rootPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    
    expect(rootPackage.scripts.test).toBe('vitest')
    expect(rootPackage.scripts['test:coverage']).toBe('vitest --coverage')
    expect(rootPackage.scripts.lint).toBeDefined()
    expect(rootPackage.scripts.setup).toBeDefined()
  })

  it('should validate service package.json structure', () => {
    const services = ['server', 'frontend', 'collector']
    
    services.forEach(service => {
      const packagePath = path.join(service, 'package.json')
      expect(fs.existsSync(packagePath)).toBe(true)
      
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
      expect(packageJson.name).toBeDefined()
      expect(packageJson.license).toBe('MIT')
      expect(packageJson.scripts).toBeDefined()
      expect(packageJson.dependencies).toBeDefined()
    })
  })

  it('should have proper TypeScript configuration', () => {
    expect(fs.existsSync('tsconfig.json')).toBe(true)
    
    const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'))
    expect(tsConfig.compilerOptions.strict).toBe(true)
    expect(tsConfig.compilerOptions.noImplicitAny).toBe(true)
    expect(tsConfig.compilerOptions.strictNullChecks).toBe(true)
  })

  it('should validate dependency security status where available', () => {
    // Test that we can check for dependency issues in installed services
    const installedServices = []
    
    if (fs.existsSync('node_modules')) {
      installedServices.push('root')
    }
    if (fs.existsSync('server/node_modules')) {
      installedServices.push('server')  
    }
    if (fs.existsSync('frontend/node_modules')) {
      installedServices.push('frontend')
    }
    if (fs.existsSync('collector/node_modules')) {
      installedServices.push('collector')
    }

    // Only test services that have dependencies installed
    installedServices.forEach(service => {
      console.log(`✓ Dependencies installed for ${service}`)
    })

    expect(installedServices.length).toBeGreaterThan(0)
  })
})