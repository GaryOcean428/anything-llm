import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Claude 4 Sonnet Integration', () => {
  it('should include Claude 4 Sonnet in the legacy model map', () => {
    const legacyMapPath = path.join(process.cwd(), 'server/utils/AiProviders/modelMap/legacy.js');
    const legacyMapContent = fs.readFileSync(legacyMapPath, 'utf8');
    
    expect(legacyMapContent).toContain('"claude-4-sonnet-20250514": 200000');
  });

  it('should include Claude 4 Sonnet in the frontend default models', () => {
    const frontendPath = path.join(process.cwd(), 'frontend/src/components/LLMSelection/AnthropicAiOptions/index.jsx');
    const frontendContent = fs.readFileSync(frontendPath, 'utf8');
    
    expect(frontendContent).toContain('id: "claude-4-sonnet-20250514"');
    expect(frontendContent).toContain('name: "Claude 4 Sonnet"');
  });

  it('should set Claude 4 Sonnet as the default model in Anthropic provider', () => {
    const anthropicPath = path.join(process.cwd(), 'server/utils/AiProviders/anthropic/index.js');
    const anthropicContent = fs.readFileSync(anthropicPath, 'utf8');
    
    expect(anthropicContent).toContain('"claude-4-sonnet-20250514"');
  });

  it('should have getMaxOutputTokens method in Anthropic provider', () => {
    const anthropicPath = path.join(process.cwd(), 'server/utils/AiProviders/anthropic/index.js');
    const anthropicContent = fs.readFileSync(anthropicPath, 'utf8');
    
    expect(anthropicContent).toContain('getMaxOutputTokens');
    expect(anthropicContent).toContain('64000');
  });

  it('should use dynamic max_tokens in getChatCompletion', () => {
    const anthropicPath = path.join(process.cwd(), 'server/utils/AiProviders/anthropic/index.js');
    const anthropicContent = fs.readFileSync(anthropicPath, 'utf8');
    
    expect(anthropicContent).toContain('max_tokens: this.getMaxOutputTokens()');
  });

  it('should place Claude 4 Sonnet first in the frontend model list', () => {
    const frontendPath = path.join(process.cwd(), 'frontend/src/components/LLMSelection/AnthropicAiOptions/index.jsx');
    const frontendContent = fs.readFileSync(frontendPath, 'utf8');
    
    // Check that Claude 4 Sonnet appears before Claude 3.7 Sonnet in the list
    const claude4Index = frontendContent.indexOf('"claude-4-sonnet-20250514"');
    const claude37Index = frontendContent.indexOf('"claude-3-7-sonnet-20250219"');
    
    expect(claude4Index).toBeLessThan(claude37Index);
    expect(claude4Index).toBeGreaterThan(-1);
  });
});