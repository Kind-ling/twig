# Twig Cold Outbound Campaign — First Paying Customer
*Target: $1+ revenue by 2026-04-28 | Tracking 20+ prospects*

---

## Prospect List

| # | Name / Handle | Project | Channel | Stars | Why Twig | Status |
|---|---------------|---------|---------|-------|----------|--------|
| 1 | @nullbuilds | nullbuilds-ai/x402-mcp | Twitter DM | 0★ | x402 MCP builder — tool descriptions are the first thing agents evaluate | ❌ DMs closed |
| 1b | @AgentlyHQ | AgentlyHQ/aixyz | Twitter DM | 81★ | Active agent framework builder, Twitter open | No reply |
| 1c | @BitRouterAI | bitrouter/bitrouter | Twitter DM | 26★ | x402 routing, pays-per-call — every skipped description is lost revenue | No reply |
| 2 | @nichxbt (nirholas) | nirholas/x402-deploy | Twitter DM | 17★ | "Turn any API into a paid service" — if agents can't read the description, they skip it | Sent ✅ |
| 3 | @ryanthegentry | ryanthegentry/402index-mcp-server | Twitter DM | 2★ | 402 Index has 15K+ endpoints — if description quality is low across the catalog, every provider loses | Sent ✅ |
| 4 | @androgavidia | leandrogavidia/solx402-mcp-server | Twitter DM | 6★ | Solana x402 MCP — niche positioning, better description = better agent routing | No reply |
| 5 | @blockrunai | BlockRunAI/blockrun-mcp | Twitter DM | 11★ | 41+ models, pay-per-request — agents won't pay without a clear description | No reply |
| 6 | @WilliamBryk | exa-labs/exa-mcp-server | Twitter DM | 4110★ | Sent ✅ — F-20 score, "search engine for AI has a discoverability problem" | Sent |
| 7 | @ViperJuice | ViperJuice/Code-Index-MCP | GitHub Discussion | 47★ | Code indexing for agents — description clarity = how well coding agents route to it | No reply |
| 8 | reprompt-dev | reprompt-dev/reprompt | GitHub Issue | 39★ | "Prompt scoring" product — natural Twig customer (they think about description quality already) | No reply |
| 9 | hanlulong | hanlulong/openecon-data | GitHub Discussion | 12★ | Economic data MCP — specialized tool, description needs to say exactly what's queryable | No reply |
| 10 | @TickTockBent | TickTockBent/charlotte | GitHub Discussion | 110★ | Token-efficient browser MCP — their value prop is efficiency, description should show that | No reply |
| 11 | Dicklesworthstone | Dicklesworthstone/mcp_agent_mail_rust | GitHub | 53★ | 34 tools, git-backed — complex tool with probably underspecified MCP descriptions | No reply |
| 12 | optave | optave/codegraph | GitHub Discussion | 36★ | 30-tool MCP server — competitive in code intelligence space, Twig competitive would show rank | No reply |
| 13 | GlitterKill | GlitterKill/sdl-mcp | GitHub | 101★ | "Saves tokens" — if the description doesn't say that, agents won't know | No reply |
| 14 | BingoWon | BingoWon/apple-rag-mcp | GitHub | 125★ | Apple docs RAG — highly specific use case that needs a highly specific description | No reply |
| 15 | Lexus2016 | Lexus2016/claude-code-studio | GitHub | 83★ | Full AI workspace with MCP — builder who understands the agent ecosystem deeply | No reply |
| 16 | botwallet-co | botwallet-co/mcp | GitHub / Discord | 2★ | "Give any AI agent a wallet" — if description is vague, wallet-needing agents route elsewhere | No reply |
| 17 | 3D-Tech-Solutions | 3D-Tech-Solutions/code-scalpel | GitHub | 11★ | "Bridge between AI and reliable engineering" — description needs to carry that positioning | No reply |
| 18 | Neverlow512 | Neverlow512/agent-droid-bridge | GitHub | 14★ | Android ADB via MCP — niche tool that will only get selected if description is precise | No reply |
| 19 | knewstimek | knewstimek/agent-tool | GitHub | 13★ | SSH/SFTP/debugger tools — agents need to know exactly what each tool does to route correctly | No reply |
| 20 | PradeepaRW | PradeepaRW/project-nova | GitHub | 28★ | 25+ specialized agents via MCP — each agent's description drives downstream routing | No reply |

---

## DM Templates

### Template A — x402 builders (paying-per-call)
*Use for: nullbuilds, nirholas, ryanthegentry, blockrunai, botwallet*

> Hey — saw your [project]. I've been building Twig (npx @kind-ling/twig), an MCP description scorer. Ran [tool-name] through it — scored [X]/100. Agents querying for [use-case] are skipping it because [specific gap in description].
>
> Here's a rewrite that scores [Y]/100:
> *"[rewrite]"*
>
> Free to try on all your tools. Happy to share the full competitive rank vs the x402 catalog if useful.

---

### Template B — GitHub MCP server builders (not yet monetized)
*Use for: ViperJuice, reprompt, hanlulong, TickTockBent, GlitterKill, BingoWon, optave*

> Hey — found [project] while scanning GitHub for MCP tools to test Twig on. Ran your tool description through it — [score]. 
>
> The issue: [specific problem with their description]. Agents searching for [their use case] won't reliably route to it.
>
> Twig's paid monitoring tier ($0.50/week) tracks your description score over time and alerts you when competitors in your category improve. First competitive analysis is free: `npx @kind-ling/twig competitive [their-url]`
>
> Worth a look?

---

### Template C — established builders (moat angle)
*Use for: Exa (already sent), reprompt (prompt-quality focus), Lexus2016*

> Hey — I was testing Twig (MCP description scorer) and [project] surfaced from the data at [score]. [One-line observation that uses their own framing against them].
>
> Not saying you don't know this — curious whether it's intentional or just a listing artifact. Happy to share the full audit free.

---

## Scoring Runs Needed Before Sending

Before sending each DM, run:
```bash
npx @kind-ling/twig analyze <their-mcp-url>
```

If they don't have a published MCP URL, use their GitHub README description. The score + one specific rewrite is what makes the DM land.

---

## Tracking

| Week | DMs Sent | Replies | Conversions | Revenue |
|------|----------|---------|-------------|---------|
| Mar 29 | 3 (Exa, nichxbt, ryanthegentry) | 0 | 0 | $0 |
| Apr 5 | | | | |
| Apr 12 | | | | |
| Apr 19 | | | | |
| Apr 28 (kill date) | | | | |

---

## Priority Order

1. **Exa (@WilliamBryk)** — sent ✅
2. **@nichxbt** — x402-deploy, 17★, active builder in the x402 space, Twitter reachable
3. **@ryanthegentry** — 402index, indexes 15K+ endpoints, multiplicative leverage (every endpoint in his catalog is a prospect)
4. **reprompt-dev** — already thinks about description/prompt quality, natural fit
5. **@TickTockBent** (charlotte) — 110★, established, GitHub Discussion is low-friction
6. **@nullbuilds** — zero stars but the most x402-native builder, likely to get it immediately
7. **@blockrunai** — pay-per-request model means they feel every skipped call

---

## The One-Line Pitch (distilled)

> "Agents can't read your mind. Twig tells you what they actually see."
