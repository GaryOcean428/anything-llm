/**
 * Test suite for Claude 4 Opus model support
 */
import { describe, test, expect } from 'vitest';
import LEGACY_MODEL_MAP from '../server/utils/AiProviders/modelMap/legacy.js';

describe('Claude 4 Opus Model Support', () => {
  test('should include Claude 4 Opus in legacy model map', () => {
    // Check that Claude 4 Opus models are in the anthropic section
    expect(LEGACY_MODEL_MAP.anthropic).toBeDefined();
    expect(LEGACY_MODEL_MAP.anthropic['claude-4-opus-20250514']).toBe(200000);
    expect(LEGACY_MODEL_MAP.anthropic['claude-4-opus-latest']).toBe(200000);
  });

  test('should have correct context window for Claude 4 Opus', () => {
    // Verify Claude 4 Opus has 200K context window
    const claude4OpusContextWindow = LEGACY_MODEL_MAP.anthropic['claude-4-opus-20250514'];
    expect(claude4OpusContextWindow).toBe(200000);
  });

  test('should include all existing Claude models', () => {
    // Ensure we haven't removed any existing models
    const anthropicModels = LEGACY_MODEL_MAP.anthropic;
    const expectedModels = [
      'claude-instant-1.2',
      'claude-2.0', 
      'claude-2.1',
      'claude-3-haiku-20240307',
      'claude-3-sonnet-20240229',
      'claude-3-opus-20240229',
      'claude-3-opus-latest',
      'claude-3-5-haiku-latest',
      'claude-3-5-haiku-20241022',
      'claude-3-5-sonnet-latest',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-sonnet-20240620',
      'claude-3-7-sonnet-20250219',
      'claude-3-7-sonnet-latest',
      'claude-4-opus-20250514',
      'claude-4-opus-latest',
    ];

    expectedModels.forEach(model => {
      expect(anthropicModels[model]).toBeDefined();
      expect(typeof anthropicModels[model]).toBe('number');
      expect(anthropicModels[model]).toBeGreaterThan(0);
    });
  });
});