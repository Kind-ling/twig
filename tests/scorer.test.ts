import { describe, it, expect } from 'vitest';
import { scoreDescription } from '../src/analyzer/scorer.js';
import { INTENT_QUERIES } from '../src/analyzer/intent-corpus.js';

describe('scoreDescription', () => {
  it('gives F to a 3-word description', () => {
    const result = scoreDescription({ name: 'exa/answer', description: 'AI-powered answer' });
    expect(result.grade).toBe('F');
    expect(result.composite).toBeLessThan(40);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('gives F to "Run wordspace AI agent loop"', () => {
    const result = scoreDescription({ name: 'wordspace/invoke', description: 'Run wordspace AI agent loop' });
    expect(result.composite).toBeLessThan(50);
    expect(result.issues.some(i => i.includes('"Run X"'))).toBe(true);
  });

  it('gives F to "Find similar pages"', () => {
    const result = scoreDescription({ name: 'exa/find-similar', description: 'Find similar pages' });
    expect(result.grade).toBe('F');
  });

  it('gives higher score to a specific description', () => {
    const good = scoreDescription({
      name: 'exa/search',
      description: 'Semantic web search. Returns ranked results with URL, title, snippet, and published date. Supports boolean operators, date ranges, and domain filtering. Best for research, fact-checking, and current events.',
    }, INTENT_QUERIES['research']);
    expect(good.composite).toBeGreaterThan(55);
  });

  it('detects "just restates name" issue', () => {
    const result = scoreDescription({ name: 'coingecko/price', description: 'coingecko price data' });
    expect(result.issues.some(i => i.includes('tool name'))).toBe(true);
  });

  it('rewards descriptions with return format hints', () => {
    const withReturn = scoreDescription({
      name: 'test/tool',
      description: 'Fetches market data. Returns JSON with price, volume, and 24h change.',
    });
    const withoutReturn = scoreDescription({
      name: 'test/tool',
      description: 'Fetches market data',
    });
    expect(withReturn.scores.specificity).toBeGreaterThan(withoutReturn.scores.specificity);
  });

  it('includes suggestions when score is low', () => {
    const result = scoreDescription({ name: 'foo/bar', description: 'Do stuff' });
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});
