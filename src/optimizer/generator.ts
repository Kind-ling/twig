/**
 * Twig Description Generator
 * Generates 3 optimized description variants for each tool.
 * Variants are scored and ranked by predicted intent match.
 */

import type { ToolDefinition, ScoreResult } from '../analyzer/scorer.js';
import type { Category } from '../analyzer/intent-corpus.js';

export interface OptimizedDescription {
  variant: 1 | 2 | 3;
  style: 'functional' | 'structured' | 'contextual';
  description: string;
  rationale: string;
  estimatedImprovement: string;
}

export interface OptimizationResult {
  tool: string;
  original: ScoreResult;
  variants: OptimizedDescription[];
  recommended: OptimizedDescription;
}

/**
 * Generate optimized descriptions for a tool.
 * Three styles:
 * 1. Functional — what it does + what it returns
 * 2. Structured — input → output with constraints
 * 3. Contextual — when to use it + examples
 */
export function generateOptimizedDescriptions(
  tool: ToolDefinition,
  original: ScoreResult,
  category: Category
): OptimizationResult {
  const params = extractParams(tool);
  const name = tool.name;

  const variants: OptimizedDescription[] = [
    generateFunctional(name, tool.description, params, category),
    generateStructured(name, tool.description, params, category),
    generateContextual(name, tool.description, params, category),
  ];

  // Recommend whichest has most improvement potential given original issues
  const recommended = selectRecommended(variants, original);

  return { tool: name, original, variants, recommended };
}

function extractParams(tool: ToolDefinition): string[] {
  return Object.keys(tool.inputSchema?.properties ?? {});
}

function generateFunctional(name: string, desc: string, params: string[], category: Category): OptimizedDescription {
  // Pattern: [Action verb] [what] [key constraint]. Returns [output format].
  const actionMap: Record<string, string> = {
    'get': 'Fetches', 'fetch': 'Fetches', 'search': 'Searches',
    'generate': 'Generates', 'create': 'Creates', 'run': 'Executes',
    'send': 'Sends', 'check': 'Checks', 'analyze': 'Analyzes',
    'swap': 'Gets', 'invoke': 'Runs',
  };

  const firstWord = name.split(/[/_-]/)[1] ?? name.split(/[/_-]/)[0] ?? '';
  const action = actionMap[firstWord.toLowerCase()] ?? 'Retrieves';
  const subject = name.split(/[/_-]/).slice(1).join(' ') || name;

  const paramHint = params.length > 0
    ? ` Accepts: ${params.slice(0, 3).join(', ')}${params.length > 3 ? ', +more' : ''}.`
    : '';

  const returnHint = getCategoryReturnHint(category);

  const generated = `${action} ${subject} data.${paramHint} ${returnHint}`.trim();

  return {
    variant: 1,
    style: 'functional',
    description: generated,
    rationale: 'Leads with action verb and subject. Adds parameter hints and return type.',
    estimatedImprovement: '+15-25 specificity score',
  };
}

function generateStructured(name: string, desc: string, params: string[], category: Category): OptimizedDescription {
  // Pattern: [Original desc, trimmed]. [Key params]. [Output].
  const cleanDesc = desc.replace(/\.$/, '').trim();
  const paramDetail = params.length > 0
    ? `Input: ${params.slice(0, 4).join(', ')}.`
    : '';
  const returnDetail = getCategoryReturnHint(category);
  const examples = getCategoryExampleHint(name, category);

  const generated = [cleanDesc, paramDetail, returnDetail, examples].filter(Boolean).join(' ');

  return {
    variant: 2,
    style: 'structured',
    description: generated,
    rationale: 'Preserves original intent, adds structured input/output detail and example.',
    estimatedImprovement: '+20-30 specificity + selectability score',
  };
}

function generateContextual(name: string, desc: string, params: string[], category: Category): OptimizedDescription {
  // Pattern: Use when [scenario]. [Action] [what]. Returns [output].
  const useCase = getCategoryUseCase(name, category);
  const cleanDesc = desc.replace(/\.$/, '').toLowerCase().trim();
  const returnDetail = getCategoryReturnHint(category);

  const generated = `${useCase} ${cleanDesc}. ${returnDetail}`;

  return {
    variant: 3,
    style: 'contextual',
    description: generated,
    rationale: 'Leads with use case — optimizes for LLM decision-making context.',
    estimatedImprovement: '+25-35 intent match score',
  };
}

function getCategoryReturnHint(category: Category): string {
  const hints: Record<Category, string> = {
    'crypto-defi': 'Returns structured JSON with amounts, addresses, and transaction data.',
    'data-feeds': 'Returns current data with timestamp and source.',
    'research': 'Returns ranked results with URLs, snippets, and metadata.',
    'media': 'Returns URL to generated asset or base64-encoded content.',
    'computation': 'Returns computed result as JSON.',
    'communication': 'Returns confirmation with message ID.',
    'general': 'Returns structured JSON response.',
  };
  return hints[category];
}

function getCategoryExampleHint(name: string, category: Category): string {
  const tool = name.split('/').pop() ?? name;
  const examples: Partial<Record<Category, string>> = {
    'crypto-defi': `e.g., ${tool.includes('swap') ? 'swap 100 USDC to ETH on Base' : 'fetch wallet balances for 0x...'}`,
    'research': `e.g., ${tool.includes('search') ? 'search "agent reputation systems 2026"' : 'find similar pages to a URL'}`,
    'data-feeds': `e.g., ${tool.includes('price') ? 'get BTC price in USD' : 'fetch trending tokens by volume'}`,
    'media': `e.g., ${tool.includes('image') ? 'generate "robot reading a book, cinematic"' : 'animate product image to video'}`,
  };
  return examples[category] ?? '';
}

function getCategoryUseCase(name: string, category: Category): string {
  const cases: Record<Category, string> = {
    'crypto-defi': 'Use when you need on-chain data or to execute a transaction.',
    'data-feeds': 'Use when you need real-time market or price data.',
    'research': 'Use when you need to find or verify information from the web.',
    'media': 'Use when you need to generate or transform images, video, or audio.',
    'computation': 'Use when you need to process data or run custom logic.',
    'communication': 'Use when you need to send or receive messages.',
    'general': 'Use when you need a utility operation.',
  };
  return cases[category];
}

function selectRecommended(variants: OptimizedDescription[], original: ScoreResult): OptimizedDescription {
  // If selectability is the main issue, prefer contextual
  if (original.scores.selectability < 50) return variants[2]!;
  // If specificity is the main issue, prefer structured
  if (original.scores.specificity < 50) return variants[1]!;
  // Default: functional
  return variants[0]!;
}
