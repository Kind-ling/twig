/**
 * Twig API Server
 *
 * Exposes Twig core functions as HTTP endpoints.
 * TWIG_PAYMENT_ADDRESS must be set — process.exit(1) if missing.
 *
 * Endpoints:
 *   GET  /health    — liveness probe
 *   POST /analyze   — free, analyzes a tool description
 *   POST /optimize  — free, generates optimized variants
 *   POST /monitor   — x402-gated ($0.50), full monitor diff
 */

import express from 'express';
import { createServer } from 'http';
import { scoreDescription } from '../analyzer/scorer.js';
import { fetchMCPTools, fetchAgentCard } from '../analyzer/fetcher.js';
import { detectCategory, INTENT_QUERIES } from '../analyzer/intent-corpus.js';
import { generateOptimizedDescriptions } from '../optimizer/generator.js';
import { runMonitor } from '../monitor/runner.js';
import {
  getPaymentAddress,
  getPaymentAmount,
  PAYMENT_CURRENCY,
  PAYMENT_CHAIN,
} from '../payments/x402-gate.js';
import type { ToolDefinition, ScoreResult } from '../analyzer/scorer.js';
import { corsMiddleware, requestLogger, errorHandler } from './middleware.js';

// ────────────────────────────────────────────────────────────
// Startup guard — fail loudly if payment address not set
// ────────────────────────────────────────────────────────────

function validateEnv(): string {
  const addr = process.env['TWIG_PAYMENT_ADDRESS'];
  if (!addr || addr.trim() === '') {
    process.stderr.write(
      JSON.stringify({
        level: 'fatal',
        event: 'startup-error',
        message:
          'TWIG_PAYMENT_ADDRESS is not set. Set it to your Base wallet address to receive payments.',
      }) + '\n',
    );
    process.exit(1);
  }
  return addr;
}

// ────────────────────────────────────────────────────────────
// Request/response types
// ────────────────────────────────────────────────────────────

export interface AnalyzeBody {
  url?: string;
  description?: string;
  name?: string;
}

export interface OptimizeBody {
  description: string;
  name?: string;
}

export interface MonitorBody {
  url: string;
  txHash?: string;
}

// ────────────────────────────────────────────────────────────
// App factory (exported for testing)
// ────────────────────────────────────────────────────────────

export function createApp(paymentAddress: string): express.Application {
  const app = express();

  app.use(corsMiddleware);
  app.use(express.json());
  app.use(requestLogger);

  // ── GET /health ─────────────────────────────────────────
  app.get('/health', (_req, res) => {
    const pkg = { version: '0.3.0' }; // aligned with package.json
    res.status(200).json({
      data: {
        status: 'ok',
        version: pkg.version,
        paymentAddress: `0x...${paymentAddress.slice(-4)}`,
      },
      error: null,
      meta: {},
    });
  });

  // ── POST /analyze ────────────────────────────────────────
  app.post('/analyze', async (req, res, next) => {
    try {
      const body = req.body as AnalyzeBody;
      let tool: ToolDefinition;

      if (body.url) {
        // Fetch from URL
        const isAgentCard =
          body.url.includes('agent.json') || body.url.includes('.well-known');
        const fetchResult = isAgentCard
          ? await fetchAgentCard(body.url)
          : await fetchMCPTools(body.url);

        if (fetchResult.error || fetchResult.tools.length === 0) {
          res.status(422).json({
            data: null,
            error: { message: fetchResult.error ?? 'No tools found at URL' },
            meta: {},
          });
          return;
        }
        tool = fetchResult.tools[0]!;
      } else if (body.description) {
        tool = { name: body.name ?? 'tool', description: body.description };
      } else {
        res.status(400).json({
          data: null,
          error: { message: 'Provide either url or description' },
          meta: {},
        });
        return;
      }

      const category = detectCategory(tool.name, tool.description);
      const result: ScoreResult = scoreDescription(tool, INTENT_QUERIES[category]);

      res.status(200).json({
        data: {
          grade: result.grade,
          score: result.composite,
          dimensions: result.scores,
          issues: result.issues,
          suggestions: result.suggestions,
        },
        error: null,
        meta: {},
      });
    } catch (err) {
      next(err);
    }
  });

  // ── POST /optimize ───────────────────────────────────────
  app.post('/optimize', (req, res, next) => {
    try {
      const body = req.body as OptimizeBody;

      if (!body.description || body.description.trim() === '') {
        res.status(400).json({
          data: null,
          error: { message: 'description is required' },
          meta: {},
        });
        return;
      }

      const tool: ToolDefinition = {
        name: body.name ?? 'tool',
        description: body.description,
      };

      const category = detectCategory(tool.name, tool.description);
      const original: ScoreResult = scoreDescription(tool, INTENT_QUERIES[category]);
      const result = generateOptimizedDescriptions(tool, original, category);

      const variants = result.variants.map(v => {
        const variantTool: ToolDefinition = { name: tool.name, description: v.description };
        const scored = scoreDescription(variantTool, INTENT_QUERIES[category]);
        return {
          style: v.style,
          description: v.description,
          score: scored.composite,
          grade: scored.grade,
        };
      });

      res.status(200).json({
        data: { variants },
        error: null,
        meta: {},
      });
    } catch (err) {
      next(err);
    }
  });

  // ── POST /monitor ────────────────────────────────────────
  app.post('/monitor', async (req, res, next) => {
    try {
      const body = req.body as MonitorBody;

      if (!body.url || body.url.trim() === '') {
        res.status(400).json({
          data: null,
          error: { message: 'url is required' },
          meta: {},
        });
        return;
      }

      // If no txHash, return 402 with payment instructions
      if (!body.txHash) {
        res.status(402).json({
          data: null,
          error: {
            message: 'Payment required',
            code: 'payment-required',
            payment: {
              address: paymentAddress,
              amount: getPaymentAmount(),
              currency: PAYMENT_CURRENCY,
              chain: PAYMENT_CHAIN,
            },
          },
          meta: {},
        });
        return;
      }

      // txHash provided — run monitor (fail-open)
      const monitorResult = await runMonitor(body.url, {
        txHash: body.txHash,
        skipCompetitive: false,
      });

      if (monitorResult.blocked) {
        // Shouldn't happen since we provided txHash, but be safe
        res.status(402).json({
          data: null,
          error: { message: 'Payment verification failed', code: 'payment-required' },
          meta: {},
        });
        return;
      }

      res.status(200).json({
        data: {
          baseline: monitorResult.isFirstRun ? null : monitorResult.run,
          current: monitorResult.run,
          diff: monitorResult.diff,
          competitive: monitorResult.competitive,
          paymentUnverified: monitorResult.paymentUnverified,
        },
        error: null,
        meta: {},
      });
    } catch (err) {
      next(err);
    }
  });

  app.use(errorHandler);

  return app;
}

// ────────────────────────────────────────────────────────────
// Entry point
// ────────────────────────────────────────────────────────────

export function startServer(): void {
  const paymentAddress = validateEnv();
  const port = parseInt(process.env['PORT'] ?? '3002', 10);

  const app = createApp(paymentAddress);
  const server = createServer(app);

  server.listen(port, () => {
    process.stderr.write(
      JSON.stringify({
        level: 'info',
        event: 'server-started',
        port,
        paymentAddress: `0x...${paymentAddress.slice(-4)}`,
      }) + '\n',
    );
  });
}

// Run when invoked directly
const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] != null &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));

if (isMain) {
  startServer();
}
