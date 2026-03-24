import { describe, it, expect } from 'vitest';
import { generateOptimizedDescriptions } from '../src/optimizer/generator.js';
import { scoreDescription } from '../src/analyzer/scorer.js';
import { INTENT_QUERIES } from '../src/analyzer/intent-corpus.js';

const EXA_ANSWER = {
  name: 'exa/answer',
  description: 'AI-powered answer',
};

const WORDSPACE = {
  name: 'wordspace/invoke',
  description: 'Run wordspace AI agent loop',
};

describe('generateOptimizedDescriptions', () => {
  it('generates 3 variants for exa/answer', () => {
    const score = scoreDescription(EXA_ANSWER, INTENT_QUERIES['research']);
    const result = generateOptimizedDescriptions(EXA_ANSWER, score, 'research');
    expect(result.variants).toHaveLength(3);
    expect(result.variants.map(v => v.style)).toContain('functional');
    expect(result.variants.map(v => v.style)).toContain('structured');
    expect(result.variants.map(v => v.style)).toContain('contextual');
  });

  it('all variants are longer than original', () => {
    const score = scoreDescription(EXA_ANSWER, INTENT_QUERIES['research']);
    const result = generateOptimizedDescriptions(EXA_ANSWER, score, 'research');
    for (const v of result.variants) {
      expect(v.description.length).toBeGreaterThan(EXA_ANSWER.description.length);
    }
  });

  it('recommended variant has rationale', () => {
    const score = scoreDescription(WORDSPACE, INTENT_QUERIES['computation']);
    const result = generateOptimizedDescriptions(WORDSPACE, score, 'computation');
    expect(result.recommended.rationale.length).toBeGreaterThan(0);
    expect(result.recommended.estimatedImprovement.length).toBeGreaterThan(0);
  });

  it('includes return format hint in variants', () => {
    const score = scoreDescription(EXA_ANSWER, INTENT_QUERIES['research']);
    const result = generateOptimizedDescriptions(EXA_ANSWER, score, 'research');
    const allText = result.variants.map(v => v.description).join(' ');
    expect(allText).toMatch(/returns?/i);
  });

  it('crypto tools get chain-specific hints', () => {
    const tool = { name: 'jupiter/swap', description: 'Get swap quote and unsigned transaction' };
    const score = scoreDescription(tool, INTENT_QUERIES['crypto-defi']);
    const result = generateOptimizedDescriptions(tool, score, 'crypto-defi');
    const allText = result.variants.map(v => v.description).join(' ').toLowerCase();
    expect(allText).toMatch(/json|address|transaction/i);
  });
});
