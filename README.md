# Twig

> Agents choose you or they don't. Twig makes them choose you.

[![CI](https://github.com/Kind-ling/twig/actions/workflows/ci.yml/badge.svg)](https://github.com/Kind-ling/twig/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@kind-ling/twig)](https://www.npmjs.com/package/@kind-ling/twig)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Part of [Kindling](https://github.com/Kind-ling) — agent SEO for the agent economy.

---

## Free audit. Paid monitoring. Premium intelligence.

| Tier | Features | Price |
|------|---------|-------|
| **Free** | `twig analyze` — score your descriptions. `twig optimize` — get better variants. | Always free |
| **Monitor** | Weekly re-scoring, competitive position, intent trend alerts | $0.50–2.00/report via x402 |
| **Intelligence** | Category benchmarks, intent corpus, competitive index | $0.50–1.00/query via x402 |
| **Enterprise** | 15% of measured x402 revenue increase | Performance-based, zero if no improvement |

---

## The Problem

Every MCP tool has a description. That description is what an LLM reads when deciding whether to call your service. It's the only signal between "selected" and "skipped".

Most descriptions are garbage.

| Tool | Current Description | Twig Score |
|------|--------------------|----|
| `exa/answer` | "AI-powered answer" | F (28/100) |
| `wordspace/invoke` | "Run wordspace AI agent loop" | F (31/100) |
| `exa/find-similar` | "Find similar pages" | F (33/100) |
| `jupiter/portfolio` | "Wallet portfolio positions" | D (42/100) |

These tools are useful. Their descriptions are not. And getting indexed in x402-discovery or MCPay doesn't help if agents skip you because they can't tell what you do.

Getting indexed is table stakes. Twig helps you get **chosen**.

---

## Quick Start

```bash
npm install -g @kind-ling/twig
```

```bash
# Free — score your descriptions
twig analyze https://myservice.com/.well-known/agent.json

# Free — get optimized variants
twig optimize https://myservice.com/.well-known/agent.json

# Paid — set up weekly monitoring
twig monitor https://myservice.com/.well-known/agent.json

# Paid — see how you rank in your category
twig competitive crypto-defi

# Paid — see what agents are actually searching for
twig intents crypto-defi
```

---

## Live API

Twig is available as a hosted API at **https://twig.kind-ling.com**

```bash
# Health check
curl https://twig.kind-ling.com/health

# Analyze any MCP server
curl -X POST https://twig.kind-ling.com/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-mcp-server.com/mcp"}'

# Optimize descriptions
curl -X POST https://twig.kind-ling.com/optimize \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-mcp-server.com/mcp", "category": "crypto-defi"}'
```

**Response format:**
```json
{
  "ok": true,
  "url": "https://your-mcp-server.com/mcp",
  "output": "🔍 Analyzing...\n  Score: 72/100 (C)\n  ..."
}
```

No API key required for public endpoints. Rate limits apply.

---

## Scoring Model

Three dimensions, 0–100 each:

| Dimension | Weight | What it measures |
|-----------|--------|-----------------|
| **Intent Match** | 40% | Similarity to top agent queries for your category |
| **Specificity** | 35% | Output format, parameters, constraints, examples present? |
| **Differentiation** | 25% | Do you stand out from similar services in your category? |

**Grades:** A (85+) · B (70+) · C (55+) · D (40+) · F (<40)

Score below 40 = agents are skipping you.

---

## What Twig Monitors

**Your descriptions** — re-scored weekly against a live intent corpus. Score changes alert you when your positioning drifts.

**Your competitive position** — how you rank vs. similar services in your category. Know when a competitor improves and overtakes you.

**Intent trends** — what agents are searching for this week vs. last. The queries change. Your descriptions need to keep up.

**Volume correlation** — description changes mapped to x402 volume changes. Close the loop between optimization and revenue.

---

## Optimization Variants

Twig generates 3 variants per tool:

**Functional** — Action verb + what + return type:
> *"Answers questions with real-time web sources. Returns a cited response with source URLs, confidence score, and supporting quotes. Best for research and fact-checking."*

**Structured** — Input → output with constraints:
> *"Web Q&A. Input: question string. Returns: answer (string), sources (URL array), confidence (0-1). Supports: factual queries, current events, research synthesis."*

**Contextual** — Use case → action → output (highest LLM selectability):
> *"Use when you need a factual answer with sourced citations. Queries the web in real-time and synthesizes a response with URLs and supporting quotes. Best for research, fact-checking, and current events."*

---

## Before / After

### `exa/answer`

**Before:** `AI-powered answer`  ← F (28/100)

**After (Contextual):** `Use when you need a factual answer with sourced citations. Queries the web in real-time and synthesizes a response with source URLs and supporting quotes. Best for research, fact-checking, and current events.`  ← B (72/100)

### `wordspace/invoke`

**Before:** `Run wordspace AI agent loop`  ← F (31/100)

**After (Structured):** `Executes a Wordspace multi-step agent workflow. Input: task description and optional context. Returns: completed output, intermediate steps, tool calls made. Best for complex tasks requiring multiple tool invocations. $2/call.`  ← B (74/100)

---

## Revenue Model

### Standard (Monitoring)
Weekly reports are gated via x402 on Base. Set up once, runs automatically.

```bash
twig monitor 0xYourWallet --url https://myservice.com/.well-known/agent.json
```

### Enterprise (Performance-based)
For services with existing x402 volume:

1. `twig measure 0xWallet --baseline` — record 7-day baseline
2. Deploy Twig-optimized descriptions
3. `twig measure 0xWallet --compare` — measure delta (14–30 days later)
4. Pay 15% of the revenue increase in USDC on Base
5. Revenue flat or down? Pay nothing.

Everything measured via on-chain USDC transfer logs. No self-reporting.

---

## Supported Sources

- A2A Agent Cards (`/.well-known/agent.json`)
- MCP servers (JSON-RPC `tools/list`)
- OpenAPI specs
- Local JSON schema files
- x402-discovery catalog (for competitive analysis)

---

## CLI Reference

```
twig analyze <url>              Score descriptions (0-100, free)
twig optimize <url>             Generate 3 optimized variants (free)
twig monitor <url>              Weekly monitoring (paid via x402)
twig competitive <category>     Category ranking (paid via x402)
twig intents <category>         Top agent queries (paid via x402)
twig measure <wallet>           Measure x402 revenue
twig measure <wallet> --baseline   Save baseline
twig measure <wallet> --compare    Compare to baseline
twig report <wallet>            Revenue report with fee calculation

Categories: crypto-defi, data-feeds, research, computation, media, communication, general
```

---

*Twig v0.1.0 · [Kind-ling](https://github.com/Kind-ling) · [Permanent Upper Class](https://permanentupperclass.com) · MIT*
