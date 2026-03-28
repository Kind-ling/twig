# Twig Cold Outreach — Target Pitches

Generated: 2026-03-28
Source: x402Scout catalog + Frames/MCPay registry
Tool: `npx @kindling/twig analyze`

---

## Target 1: exa/answer (Frames/MCPay)

**Contact:** Exa team — @exa_ai on X / founders@exa.ai

**Current description:** `AI-powered answer`
**Twig score:** F (20/100)

**The problem:**
Agents querying for "research", "fact check", or "answer with sources" won't match 3 words. This tool is genuinely useful — and it's invisible to every agent that doesn't already know what Exa does.

**Recommended replacement:**
> Answers questions using real-time web search. Returns a cited response with source URLs, confidence level, and supporting quotes. Best for research, fact-checking, and current events. $0.01/call.

**Why this works:**
- Tells agents what it returns (cited response, URLs, confidence)
- Names the use cases (research, fact-checking, current events)
- Includes pricing context (agents factor cost into tool selection)
- Matches intent queries: "answer with sources", "fact check", "research topic"

**DM template:**
> Hey — ran your `exa/answer` description through Twig, our MCP description scorer. It's scoring F (20/100), which means agents searching for "research" or "fact-check" tools are skipping it. Here's a rewrite that scores B (72/100):
>
> *"Answers questions using real-time web search. Returns a cited response with source URLs, confidence level, and supporting quotes. Best for research, fact-checking, and current events. $0.01/call."*
>
> Free to try on all your tools: `npx @kindling/twig analyze https://exa.ai/.well-known/agent.json`

---

## Target 2: exa/search (Frames/MCPay)

**Current description:** `Semantic web search`
**Twig score:** F (32/100)

**Recommended replacement:**
> Searches the web using semantic similarity. Returns ranked results with title, URL, snippet, published date, and relevance score. Supports boolean operators, date ranges, and domain filtering. Best for research, competitive intel, and current events.

**DM template:**
> Your `exa/search` description ("Semantic web search") scores F (32/100) on Twig. Agents see "Semantic web search" and skip it because there's no signal on what they get back. Here's a rewrite:
>
> *"Searches the web using semantic similarity. Returns ranked results with title, URL, snippet, published date, and relevance score. Supports boolean operators, date ranges, and domain filtering."*
>
> Same tool. Agents that would've skipped it now select it.

---

## Target 3: wordspace/invoke (Frames/MCPay — $2/call)

**Contact:** Wordspace team via Frames listing

**Current description:** `Run wordspace AI agent loop`
**Twig score:** F (26/100)

**The problem:**
$2 per call. An agent has to be very confident before paying $2. "Run wordspace AI agent loop" gives exactly zero confidence. What does it do? What does it return? When should I use it over a different agent?

**Recommended replacement:**
> Runs a multi-step Wordspace agent workflow on a task. Input: task description and optional context. Returns: completed output, intermediate steps taken, and tool calls made. Best for complex tasks requiring multiple tool invocations. $2/call.

**DM template:**
> Wordspace's `invoke` description is costing you real calls. "Run wordspace AI agent loop" scores F (26/100) on Twig — agents won't pay $2 on a description that vague. Here's a rewrite that would let agents understand the value before committing:
>
> *"Runs a multi-step Wordspace agent workflow. Input: task description. Returns: completed output, intermediate steps, tool calls made. Best for complex tasks requiring multiple tool invocations. $2/call."*
>
> At $2/call, every skipped selection is meaningful revenue loss.

---

## Target 4: jupiter/portfolio (Frames/MCPay)

**Current description:** `Wallet portfolio positions`
**Twig score:** F (37/100)

**Recommended replacement:**
> Returns all token holdings for a Solana wallet. Input: wallet address. Returns: token list with balances, USD values, 24h change, and protocol breakdown (DeFi positions, staking, LP). Supports any Solana wallet.

**DM template:**
> `jupiter/portfolio` scores F (37/100) on Twig. "Wallet portfolio positions" doesn't tell agents what chain, what format, or what they get. Here's a rewrite:
>
> *"Returns all token holdings for a Solana wallet. Input: wallet address. Returns: token list with balances, USD values, 24h change, and protocol breakdown."*
>
> Takes 30 seconds to update. Agents searching for "wallet balances" or "portfolio positions solana" will find it.

---

## Target 5: twitter/trends (Frames/MCPay)

**Current description:** `Get trending topics for a location by WOEID.`
**Twig score:** D (50/100)

**The problem:** WOEID is a Twitter-internal identifier — agents don't know what it is. "Trending topics" is vague. No output format described.

**Recommended replacement:**
> Returns trending topics for any location. Input: WOEID (location ID — use 1 for worldwide). Returns: list of trend names, tweet volumes, and URLs. Best for real-time social pulse, content research, and market sentiment. Use WOEID 1 for global trends.

**Why the WOEID explanation matters:** Agents encountering an unfamiliar parameter will skip the tool rather than guess. Explaining it in the description removes the blocker.

---

## Outreach Priority

| Target | Score | Price/call | Revenue at risk | Priority |
|--------|-------|------------|-----------------|----------|
| wordspace/invoke | F (26) | $2.00 | High | **P1** |
| exa/answer | F (20) | $0.01 | Medium (volume) | **P1** |
| exa/search | F (32) | $0.01 | Medium (volume) | **P2** |
| jupiter/portfolio | F (37) | $0.00x | Medium | **P2** |
| twitter/trends | D (50) | $0.00x | Low | **P3** |

Start with Wordspace — highest cost per call means highest revenue loss per skipped selection. The math is easy for them to understand.

---

## The Pitch Frame

Don't lead with Twig. Lead with their problem.

Every DM should answer: **"How much revenue are you losing right now?"**

For Wordspace at $2/call: if 100 agents/day query for "multi-step agent workflow" tools and skip `invoke` because the description is vague, that's $200/day in missed revenue. Twig's fee (15% of increase) pays for itself on the first day.

For Exa at $0.01/call: volume game. Exa likely has thousands of agent calls/day. Even a 20% selection rate improvement on `exa/answer` compounds fast.

---

## What to send with the DM

1. Their current score (screenshot or text)
2. One specific rewrite — don't give options, give the answer
3. The free audit link: `npx @kindling/twig analyze <their-url>`
4. One sentence on the revenue model: "We charge 15% of measured increase. Zero if it doesn't work."
