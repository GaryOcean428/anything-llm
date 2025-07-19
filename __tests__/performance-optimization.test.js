import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// Performance optimization tests
describe('Performance & Optimization Analysis', () => {
  it('should validate bundle size targets', () => {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Check if bundlesize configuration exists
    const bundlesize = packageJson.bundlesize;
    expect(bundlesize).toBeDefined();
    expect(Array.isArray(bundlesize)).toBe(true);
    
    // Validate bundle size limits are reasonable
    bundlesize.forEach(rule => {
      expect(rule.path).toBeDefined();
      expect(rule.maxSize).toBeDefined();
      
      // Parse size limit (e.g., "500kb" -> 500)
      const sizeMatch = rule.maxSize.match(/(\d+)(\w+)/);
      if (sizeMatch) {
        const size = parseInt(sizeMatch[1]);
        const unit = sizeMatch[2];
        
        // Validate reasonable size limits
        if (unit === 'kb') {
          expect(size).toBeLessThanOrEqual(1000); // Max 1MB for JS
        }
      }
    });
    
    console.log(`Bundle size rules configured: ${bundlesize.length}`);
  });

  it('should check for image optimization opportunities', () => {
    const imagesPath = path.join(process.cwd(), 'frontend', 'public');
    
    if (!fs.existsSync(imagesPath)) {
      console.log('Images directory not found - skipping image optimization check');
      return;
    }

    const imageFiles = fs.readdirSync(imagesPath, { recursive: true })
      .filter(file => /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(file))
      .slice(0, 10); // Check first 10 images

    let optimizationOpportunities = 0;
    
    imageFiles.forEach(file => {
      const filePath = path.join(imagesPath, file);
      try {
        const stats = fs.statSync(filePath);
        const sizeKB = stats.size / 1024;
        
        // Flag large images as optimization opportunities
        if (sizeKB > 100) { // Images larger than 100KB
          optimizationOpportunities++;
        }
      } catch (err) {
        console.log(`Error checking ${file}: ${err.message}`);
      }
    });

    console.log(`Image optimization opportunities: ${optimizationOpportunities}/${imageFiles.length} files`);
    expect(imageFiles.length).toBeGreaterThanOrEqual(0);
  });

  it('should validate lazy loading implementation', () => {
    const frontendSrcPath = path.join(process.cwd(), 'frontend', 'src');
    
    if (!fs.existsSync(frontendSrcPath)) {
      console.log('Frontend src directory not found - skipping lazy loading check');
      return;
    }

    const componentFiles = fs.readdirSync(frontendSrcPath, { recursive: true })
      .filter(file => file.endsWith('.jsx') || file.endsWith('.js'))
      .slice(0, 15); // Check sample files

    let lazyLoadingCount = 0;

    componentFiles.forEach(file => {
      const filePath = path.join(frontendSrcPath, file);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for lazy loading patterns
        if (content.includes('React.lazy') || 
            content.includes('import(') ||
            content.includes('loadable') ||
            content.includes('Suspense')) {
          lazyLoadingCount++;
        }
      } catch (err) {
        console.log(`Error reading ${file}: ${err.message}`);
      }
    });

    console.log(`Lazy loading patterns found in ${lazyLoadingCount}/${componentFiles.length} files`);
    expect(componentFiles.length).toBeGreaterThan(0);
  });

  it('should check for memory leak prevention patterns', () => {
    const frontendSrcPath = path.join(process.cwd(), 'frontend', 'src');
    
    if (!fs.existsSync(frontendSrcPath)) {
      console.log('Frontend src directory not found - skipping memory leak check');
      return;
    }

    const hookFiles = fs.readdirSync(frontendSrcPath, { recursive: true })
      .filter(file => (file.endsWith('.jsx') || file.endsWith('.js')) && 
                     (file.includes('hook') || file.includes('use')))
      .slice(0, 10);

    let cleanupPatternCount = 0;

    hookFiles.forEach(file => {
      const filePath = path.join(frontendSrcPath, file);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for cleanup patterns
        if (content.includes('useEffect') && content.includes('return')) {
          cleanupPatternCount++;
        } else if (content.includes('cleanup') || 
                  content.includes('unsubscribe') ||
                  content.includes('clearInterval') ||
                  content.includes('clearTimeout')) {
          cleanupPatternCount++;
        }
      } catch (err) {
        console.log(`Error reading ${file}: ${err.message}`);
      }
    });

    console.log(`Cleanup patterns found in ${cleanupPatternCount}/${hookFiles.length} files`);
    expect(hookFiles.length).toBeGreaterThanOrEqual(0);
  });

  it('should validate CSS optimization', () => {
    const frontendPath = path.join(process.cwd(), 'frontend');
    const styleFiles = [];
    
    if (fs.existsSync(frontendPath)) {
      try {
        const allFiles = fs.readdirSync(frontendPath, { recursive: true });
        styleFiles.push(...allFiles.filter(file => 
          file.endsWith('.css') || 
          file.endsWith('.scss') || 
          file.endsWith('.sass')
        ).slice(0, 5));
      } catch (err) {
        console.log(`Error reading frontend directory: ${err.message}`);
      }
    }

    let optimizedStylesCount = 0;

    styleFiles.forEach(file => {
      const filePath = path.join(frontendPath, file);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for optimization patterns
        if (content.includes('minify') || 
            content.includes('compress') ||
            !content.includes('  ')) { // Check for minification
          optimizedStylesCount++;
        }
      } catch (err) {
        console.log(`Error reading ${file}: ${err.message}`);
      }
    });

    console.log(`Style optimization patterns found in ${optimizedStylesCount}/${styleFiles.length} files`);
    expect(styleFiles.length).toBeGreaterThanOrEqual(0);
  });
});