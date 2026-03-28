# Twig — Spec 002: Monitoring Tier + x402 Gate

## Task: Implement `twig monitor` with x402 payment gate and weekly diff reports

### Context

Twig v0.1.0 shipped with free `twig analyze` and `twig optimize`. Phase 1 exit criteria require at least 1 paying customer. The paid product is continuous monitoring — weekly re-scoring with diffs, competitive position, and intent trend alerts.

Five cold outreach targets have been identified with personalized before/after rewrites. The monitoring tier is what converts them from "free audit" to recurring revenue.

Current state:
- `@kind-ling/twig@0.1.0` on npm — analyze + optimize working
- Flat repo at github.com/Kind-ling/twig
- 12 tests passing
- No payment gate, no monitoring loop, no diff detection

### Goal

A `twig monitor <url>` CLI command that:
1. Re-scores an agent.json on a schedule (or on-demand)
2. Diffs scores against prior run (what changed, by how much)
3. Shows competitive position (where you rank in your category vs. x402-discovery catalog)
4. Gates the weekly report behind an x402 micropayment ($0.50–$2.00 USDC on Base)
5. Stores run history locally (~/.twig/history.json) so diffs are meaningful

### Acceptance Criteria

- [ ] `twig monitor <url>` runs a fresh analyze, compares to stored prior run, outputs diff
- [ ] Diff shows: score changes per dimension, grade change, new/resolved issues
- [ ] Competitive position: fetches x402-discovery catalog, scores top 10 in same category, shows percentile rank
- [ ] x402 payment gate: first run free (stores baseline), subsequent reports require payment
- [ ] Payment receipt stored in `~/.twig/receipts/` — don't re-gate already-paid reports
- [ ] History stored in `~/.twig/history/<hash-of-url>.json` — append-only
- [ ] `twig monitor --history <url>` shows all prior runs in table format
- [ ] Graceful degradation: if x402-discovery catalog unavailable, skip competitive section with warning
- [ ] All new functions covered by tests
- [ ] TypeScript strict mode maintained throughout

### Constraints

- Flat repo structure — add to existing src/ dirs, don't restructure
- Named exports only
- x402 payment verification must be fail-open (if verification fails, log warning but don't block report — prevents payment bugs from breaking the product)
- History files are append-only (never overwrite, only append)
- No hardcoded wallet addresses — use config with sensible default
- Follow all CLAUDE.md conventions

### Files to Touch

```
src/
  monitor/
    runner.ts          # Schedule/trigger monitor runs
    diff.ts            # Score diff computation
    history.ts         # Read/write ~/.twig/history/
    competitive.ts     # Fetch x402-discovery, score category peers
    types.ts           # Monitor-specific types
  payments/
    x402-gate.ts       # Payment verification + receipt storage
    types.ts           # Payment types
  cli.ts               # Add `monitor` command + `monitor --history`

tests/
  monitor/
    diff.test.ts
    history.test.ts
    competitive.test.ts
  payments/
    x402-gate.test.ts
```

### Verify By

- `npm test` passes (all existing + new tests)
- `npx @kind-ling/twig monitor https://exa.ai/.well-known/agent.json` → baseline stored, free first run
- Second run → prompts for payment (or shows payment instructions)
- `twig monitor --history https://exa.ai/.well-known/agent.json` → table of prior runs
- Simulate a score change → diff output shows what changed

### Model Routing

- **Planning:** `opus` — payment gate design, history schema, competitive ranking logic
- **Implementation:** `sonnet` — well-specified, mechanical
- **Payment handling review:** `opus` — security-sensitive, fail-open logic
- **Tests:** `sonnet` — mechanical

### Open Questions

1. What's the payment amount? ($0.50 flat, or $0.50/$1.00/$2.00 tiered by how many tools in the service?)
2. Should competitive position be included in the free first run, or paid-only?
3. x402 payment: does the CLI generate a payment link, or does it call Heat `/trust` to verify an inbound payment?
4. Should `twig monitor` support a `--watch` flag for continuous monitoring (re-runs every N hours)?

---

*Ready for `/plan` review before execution.*
