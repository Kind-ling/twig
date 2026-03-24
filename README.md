# Twig

> Agents choose you or they don't. Twig makes them choose you.

[![CI](https://github.com/Kind-ling/twig/actions/workflows/ci.yml/badge.svg)](https://github.com/Kind-ling/twig/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@kindling/twig)](https://www.npmjs.com/package/@kindling/twig)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Part of [Kindling](https://github.com/Kind-ling) — open infrastructure for the agent economy.

---

## The Problem

Every MCP tool has a description. That description is what an LLM reads when deciding whether to call your tool. It's the only signal between "selected" and "skipped".

Most descriptions are garbage.

| Tool | Current Description | What Agents See |
|------|--------------------|----|
| `exa/answer` | "AI-powered answer" | Skip |
| `wordspace/invoke` | "Run wordspace AI agent loop" | Skip |
| `exa/find-similar` | "Find similar pages" | Skip |
| `jupiter/portfolio` | "Wallet portfolio positions" | Skip |

These tools are useful. Their descriptions are not. The tools that win are the ones with descriptions that tell agents exactly what they'll get.

---

## The Solution

Twig scores your current descriptions (0-100) and generates optimized variants. Revenue model: **15% of measured x402 revenue increase**. Pay nothing if it doesn't work.

```bash
npx @kindling/twig analyze https://myservice.com/.well-known/agent.json
```

```
exa/answer          | F |  28 | Too short — agents skip vague tools
wordspace/invoke    | F |  31 | "Run X" tells agents nothing about what X does
jupiter/portfolio   | D |  42 | Just names the category, not the capability
exa/search          | B |  71 | ✓ OK

Average score: 43/100

Run: twig optimize https://myservice.com/.well-known/agent.json
```

---

## Quick Start

```bash
npm install -g @kindling/twig
```

```bash
# Score your current descriptions
twig analyze https://yourservice.com/.well-known/agent.json

# Get optimized variants
twig optimize https://yourservice.com/.well-known/agent.json

# Set revenue baseline before optimization
twig measure 0xYourWallet --baseline

# Compare after deploying new descriptions (14+ days later)
twig measure 0xYourWallet --compare

# Full report with Twig fee calculation
twig report 0xYourWallet --period 30d
```

---

## Scoring Model

Three dimensions, 0-100 each:

| Dimension | Weight | Measures |
|-----------|--------|---------|
| **Intent Match** | 40% | Does description match what agents actually search for? |
| **Specificity** | 35% | Are outputs, constraints, and examples concrete? |
| **Selectability** | 25% | Would an LLM choose this over similar tools? |

**Grades:** A (85+) · B (70+) · C (55+) · D (40+) · F (<40)

---

## Optimization Variants

Twig generates 3 variants per tool:

**Functional** — Action verb + what + return type:
> *"Fetches market data for any token. Returns JSON with price, 24h change, volume, and market cap. Accepts token symbol or contract address."*

**Structured** — Input → output with constraints:
> *"Token price lookup. Input: symbol or address. Returns: price (USD/EUR/BTC), 24h change, volume, market cap. Supports 10k+ tokens across 100+ chains."*

**Contextual** — Use case → action → output:
> *"Use when you need real-time token pricing. Queries CoinGecko across 100+ chains. Returns structured price data with 24h metrics."*

---

## Revenue Model

Twig is free to use. We charge 15% of measured revenue increase, paid in USDC on Base.

- Set a baseline before optimization: `twig measure <wallet> --baseline`
- Run for 14-30 days with new descriptions
- Compare: `twig measure <wallet> --compare`
- Revenue up? Pay 15% of the delta. Revenue flat or down? Pay nothing.

Everything is measured on-chain. No self-reporting. No trust required.

---

## Before / After

### `exa/answer`

**Before:** `AI-powered answer`

**After:** `Use when you need a factual answer with sourced citations. Queries the web in real-time and synthesizes a response with URLs and supporting quotes. Best for research, fact-checking, and current events.`

**Score:** F (28) → B (72)

### `wordspace/invoke`

**Before:** `Run wordspace AI agent loop`

**After:** `Executes a multi-step Wordspace agent workflow. Input: task description and optional context. Returns: completed task output, intermediate steps, and tool calls made. Best for complex tasks requiring multiple tool invocations. $2/call.`

**Score:** F (31) → B (74)

---

## Supported Sources

- A2A Agent Cards (`/.well-known/agent.json`)
- MCP servers (JSON-RPC `tools/list`)
- OpenAPI specs
- Local JSON schema files

---

*Twig v0.1.0 · [Permanent Upper Class](https://permanentupperclass.com) · MIT*
