import { describe, it, expect } from 'vitest';
import { MODEL_MAP } from '../server/utils/AiProviders/modelMap/index.js';
import { getCustomModels } from '../server/utils/helpers/customModels.js';

// Test that the new grok-3-beta model is properly defined
describe('Grok 3 Beta Model Support', () => {
  it('should include grok-3-beta in model map', () => {
    const contextWindow = MODEL_MAP.get('xai', 'grok-3-beta');
    // The remote model map shows 131072 as the context window for grok-3-beta
    expect(contextWindow).toBeGreaterThan(0);
    expect(typeof contextWindow).toBe('number');
  });

  it('should include grok-3-beta in fallback models', async () => {
    // This will use fallback since we don't have a real API key
    const result = await getCustomModels('xai', 'fake-key');
    const modelIds = result.models.map(m => m.id);
    expect(modelIds).toContain('grok-3-beta');
    expect(modelIds).toContain('grok-beta');
  });

  it('should preserve existing grok-beta model', () => {
    const contextWindow = MODEL_MAP.get('xai', 'grok-beta');
    expect(contextWindow).toBe(131072);
  });

  it('should handle multiple xai models', () => {
    const xaiModels = MODEL_MAP.get('xai');
    expect(xaiModels).toBeTruthy();
    expect(typeof xaiModels).toBe('object');
    expect(Object.keys(xaiModels)).toContain('grok-3-beta');
    expect(Object.keys(xaiModels)).toContain('grok-beta');
  });
});