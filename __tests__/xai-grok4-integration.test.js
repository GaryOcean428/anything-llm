// Test for xAI Grok 4 model integration
import { describe, it, expect } from 'vitest';
import LEGACY_MODEL_MAP from '../server/utils/AiProviders/modelMap/legacy.js';

describe('xAI Grok 4 Integration', () => {
  it('should include grok-4 in the legacy model map with correct context window', () => {
    const xaiModels = LEGACY_MODEL_MAP.xai;
    
    // Check if grok-4 is in the model map
    expect(xaiModels).toHaveProperty('grok-4');
    
    // Check if context window is correctly set to 256,000 tokens
    expect(xaiModels['grok-4']).toBe(256000);
  });

  it('should still include grok-beta for backward compatibility', () => {
    const xaiModels = LEGACY_MODEL_MAP.xai;
    
    // Check if grok-beta is still available
    expect(xaiModels).toHaveProperty('grok-beta');
    expect(xaiModels['grok-beta']).toBe(131072);
  });

  it('should have both models defined in the legacy map', () => {
    const xaiModels = LEGACY_MODEL_MAP.xai;
    const modelKeys = Object.keys(xaiModels);
    
    expect(modelKeys).toContain('grok-beta');
    expect(modelKeys).toContain('grok-4');
    expect(modelKeys.length).toBe(2);
  });
});