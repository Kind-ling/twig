# Twig MVP — Spec 001: Core Audit Engine [COMPLETED 2026-03-28]

> **Status: SHIPPED** — Implementation diverged from spec (flat repo, 3 dimensions instead of 5, different scoring weights). See CLAUDE.md "What Was Actually Built" for what shipped. This spec is preserved for reference only.
>
> **Next spec:** See `specs/TWIG_SPEC_002.md` — monitoring tier + x402 gate.

---

## Task: Build the MCP description parser, scorer, and rewrite generator

### Context

Twig is Kindling's primary revenue product. It audits MCP server descriptions and A2A Agent Cards for discoverability, clarity, and agent-readability. The free hook is a one-time audit scan. The paid product is continuous SaaS monitoring.

This spec covers the core audit engine only — the scoring and rewrite logic that everything else builds on.

Five cold outreach targets have been identified from the x402 Bazaar with personalized before/after description rewrites ready to send. This engine needs to be good enough to generate those rewrites programmatically.

### Goal

A TypeScript library (`packages/twig-core`) that:
1. Accepts an MCP server description or A2A Agent Card as input
2. Scores it across multiple dimensions
3. Generates a rewritten description optimized for agent discoverability
4. Returns structured results (scores + rewrite + reasoning)

### Acceptance Criteria

- [ ] Parses MCP `server.description`, `tool.description`, and `tool.inputSchema` fields
- [ ] Parses A2A Agent Card `name`, `description`, `skills`, `capabilities` fields
- [ ] Scores across 5 dimensions: clarity (0-100), specificity (0-100), agent-readability (0-100), keyword density (0-100), action-orientation (0-100)
- [ ] Composite score: weighted average of dimensions
- [ ] Generates rewritten description that scores higher than input on all dimensions
- [ ] Rewrite preserves factual accuracy (doesn't hallucinate capabilities)
- [ ] All functions are pure (no side effects, no API calls within core)
- [ ] Input validation with clear error messages
- [ ] 90%+ test coverage on scoring functions
- [ ] Exported types for all inputs and outputs

### Constraints

- TypeScript, named exports only
- Zero external dependencies for scoring logic (pure functions)
- LLM calls for rewrite generation are injected as a function parameter (not hardcoded to any provider) — this lets us route through OpenClaw
- Scoring rubrics are defined as data (JSON/TS objects), not hardcoded in logic
- Tests in `tests/twig-core/`
- Follow all CLAUDE.md conventions

### Files to Create

```
packages/twig-core/
  src/
    index.ts                 # Public API (named exports)
    parser/
      mcp-parser.ts          # Parse MCP server manifest
      a2a-parser.ts          # Parse A2A Agent Card
      types.ts               # Input types
    scorer/
      dimensions.ts          # Scoring rubrics as data
      score.ts               # Scoring engine
      types.ts               # Score types
    rewriter/
      rewrite.ts             # Rewrite generator (LLM-injectable)
      types.ts               # Rewrite types
    types.ts                 # Shared types
  package.json
  tsconfig.json
  vitest.config.ts

tests/twig-core/
  parser/
    mcp-parser.test.ts
    a2a-parser.test.ts
  scorer/
    score.test.ts
  rewriter/
    rewrite.test.ts
```

### Verify By

- `pnpm test` passes with 90%+ coverage
- Feed a real MCP description from x402 Bazaar → get structured scores + rewrite
- Compare generated rewrite against the manual before/after rewrites already prepared
- Rewrite scores higher than original on all 5 dimensions

### Model Routing

- **Planning:** `opus` — architecture decisions, scoring rubric design
- **Implementation:** `sonnet` — pure functions, well-specified behavior
- **Rewrite quality tuning:** `opus` — taste decisions on what makes a good description
- **Tests:** `sonnet` — mechanical, well-specified

### Open Questions

1. Should scoring rubrics be versioned? (Probably yes — track rubric version in output so audits are reproducible)
2. What weight per dimension in composite score? (Start equal, tune with data)
3. Should we support partial input? (e.g., Agent Card with missing fields → score what exists, flag what's missing)

---

*This spec is ready for `/plan` review before execution.*
