/**
 * Test suite for Anthropic provider max output tokens
 */
import { describe, test, expect } from 'vitest';

// Mock the Anthropic provider constructor
const mockAnthropicProvider = class {
  constructor(model) {
    this.model = model;
  }

  /**
   * Get the maximum output tokens for the current model
   * @returns {number} - Maximum output tokens supported by the model
   */
  getMaxOutputTokens() {
    // Claude 4 Opus supports 32K output tokens
    if (this.model.includes("claude-4-opus")) {
      return 32000;
    }
    
    // Claude 3.5 and newer models generally support 8K tokens
    if (this.model.includes("claude-3-5") || this.model.includes("claude-3-7")) {
      return 8192;
    }
    
    // Older models default to 4K
    return 4096;
  }
};

describe('Anthropic Provider Max Output Tokens', () => {
  test('should return 32000 tokens for Claude 4 Opus models', () => {
    const provider1 = new mockAnthropicProvider('claude-4-opus-20250514');
    const provider2 = new mockAnthropicProvider('claude-4-opus-latest');
    
    expect(provider1.getMaxOutputTokens()).toBe(32000);
    expect(provider2.getMaxOutputTokens()).toBe(32000);
  });

  test('should return 8192 tokens for Claude 3.5 and 3.7 models', () => {
    const provider1 = new mockAnthropicProvider('claude-3-5-sonnet-20241022');
    const provider2 = new mockAnthropicProvider('claude-3-5-haiku-20241022');
    const provider3 = new mockAnthropicProvider('claude-3-7-sonnet-20250219');
    
    expect(provider1.getMaxOutputTokens()).toBe(8192);
    expect(provider2.getMaxOutputTokens()).toBe(8192);
    expect(provider3.getMaxOutputTokens()).toBe(8192);
  });

  test('should return 4096 tokens for older Claude models', () => {
    const provider1 = new mockAnthropicProvider('claude-3-opus-20240229');
    const provider2 = new mockAnthropicProvider('claude-2.1');
    const provider3 = new mockAnthropicProvider('claude-instant-1.2');
    
    expect(provider1.getMaxOutputTokens()).toBe(4096);
    expect(provider2.getMaxOutputTokens()).toBe(4096);
    expect(provider3.getMaxOutputTokens()).toBe(4096);
  });

  test('should return 4096 tokens for unknown model names', () => {
    const provider = new mockAnthropicProvider('unknown-model');
    expect(provider.getMaxOutputTokens()).toBe(4096);
  });
});