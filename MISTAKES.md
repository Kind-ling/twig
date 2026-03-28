# MISTAKES.md — Kindling Error Corpus

> Append-only during the day. Review weekly.
> Patterns that repeat get promoted to CLAUDE.md as permanent rules.
> Format: date → what happened → fix → whether it should become a rule.

---

## Template

```
### [Short description of the mistake]
- **Date:** YYYY-MM-DD
- **What happened:** [What the agent did wrong]
- **Expected:** [What should have happened]
- **Fix:** [How it was corrected]
- **Root cause:** [Why it happened — vague spec? Missing convention? Model limitation?]
- **Rule candidate:** YES/NO — [If YES, draft the rule for CLAUDE.md]
```

---

## Log

*No entries yet. First mistake hasn't happened — or hasn't been logged.*

---

## 2026-03-28

### Dead variable after refactor
- **What happened:** `walletAddress` was assigned in a try/catch in `runner.ts` but the function it was meant to feed (`checkPaymentGate`) already calls `getPaymentAddress()` internally. The variable was never read.
- **Expected:** Dead code removed before commit
- **Fix:** Deleted the block, removed unused import
- **Root cause:** Plan specified separate wallet address resolution, implementation changed the architecture but left the dead block
- **Rule candidate:** YES — add to CLAUDE.md: "After implementation, grep for variables assigned but never read. Dead assignments are a sign the plan and implementation diverged silently."

### Wrong reason code on gated path
- **What happened:** Payment gate returned `reason: 'payment-verified'` when the user hadn't paid yet (no txHash provided). Semantically inverted — "verified" used to mean "go pay now."
- **Expected:** A distinct `'payment-required'` reason variant for the unpaid path
- **Fix:** Added `'payment-required'` to union, used it in the unpaid branch
- **Root cause:** Types were defined after implementation; the implementer reused the closest existing variant without adding a new one
- **Rule candidate:** YES — add to CLAUDE.md: "Define all type union variants before implementation begins. Don't reuse existing variants for semantically different states."

### verifyOnChain accepted any mined transaction
- **What happened:** `verifyOnChain` called `eth_getTransactionByHash`, checked `blockNumber !== null`, returned `true`. Never verified recipient address or USDC transfer amount. Any mined tx on Base would pass.
- **Expected:** Either real ERC-20 Transfer log verification, or a safe `return false` stub with clear TODO
- **Fix:** Replaced with `return false` stub + detailed TODO for eth_getTransactionReceipt + Transfer log decoding
- **Root cause:** On-chain verification is non-trivial; implementer wrote a partial stub that looked functional but had no security value
- **Rule candidate:** YES — add to CLAUDE.md: "Payment verification stubs must return `false` (not `true`) by default. A stub that accepts payment is a security hole. Fail-open in the gate, not in the verifier."

### JSON.parse without try/catch on user files
- **What happened:** `loadHistory` and `loadReceipts` both called `JSON.parse` on file contents without error handling. A corrupt file crashes the CLI.
- **Expected:** try/catch with structured stderr warning and `[]` fallback
- **Fix:** Added try/catch to both functions
- **Root cause:** Pattern not established for file reads — implementer didn't think about corruption
- **Rule candidate:** YES — add to CLAUDE.md: "Any `JSON.parse` on a file from disk must be wrapped in try/catch. User files can be corrupt. Always return a safe empty value and log a structured warning."

---

## 2026-03-28

### Dead variable after refactor
- **What happened:** `walletAddress` was assigned in a try/catch in `runner.ts` but never used — `checkPaymentGate` already calls `getPaymentAddress()` internally.
- **Fix:** Deleted block, removed unused import.
- **Root cause:** Plan specified separate wallet address resolution; implementation changed the architecture but left dead code.
- **Rule candidate:** YES — grep for variables assigned but never read after implementation. Dead assignments mean plan and implementation diverged.

### Wrong reason code on gated path
- **What happened:** Gate returned `reason: 'payment-verified'` when user hadn't paid. "Verified" used to mean "go pay now."
- **Fix:** Added `'payment-required'` to union, used it on the unpaid branch.
- **Root cause:** Types defined after implementation; implementer reused closest existing variant instead of adding a new one.
- **Rule candidate:** YES — define all type union variants before implementation begins. Don't reuse variants for semantically different states.

### verifyOnChain accepted any mined transaction
- **What happened:** Checked `blockNumber !== null`, returned `true`. Never verified recipient address or USDC amount. Any mined Base tx would pass.
- **Fix:** Replaced with `return false` stub + TODO for eth_getTransactionReceipt + Transfer log decoding.
- **Root cause:** Partial stub looked functional but had no security value.
- **Rule candidate:** YES — payment verification stubs must return `false` by default. Fail-open in the gate, not in the verifier.

### JSON.parse without try/catch on user files
- **What happened:** `loadHistory` and `loadReceipts` called `JSON.parse` on file contents without error handling. Corrupt file = CLI crash.
- **Fix:** try/catch with structured stderr warning and `[]` fallback in both functions.
- **Root cause:** Pattern not established; implementer didn't consider file corruption.
- **Rule candidate:** YES — any `JSON.parse` on a file from disk must be wrapped in try/catch. Return a safe empty value and log a structured warning.
