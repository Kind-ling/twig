# Example: Optimizing `exa/answer`

**The problem:** `exa/answer` is one of the most useful tools on Frames — and its description is 3 words.

## Before Twig

```
AI-powered answer
```

**Twig score:** F (28/100)
- Intent match: 31 (agents searching for "research" or "fact-check" won't match this)
- Specificity: 12 (zero information about what it returns)
- Selectability: 40 (LLMs skip single-phrase descriptions)

**Issues:**
- Too short — agents skip vague tools
- "AI-powered" is noise, not signal
- No indication of output format, sources, or quality

## After Twig

### Variant 1 (Functional)
```
Answers questions using real-time web sources. Returns a cited response with 
source URLs, confidence level, and key supporting quotes. Best for factual 
queries, current events, and research synthesis. $0.01/call.
```

### Variant 2 (Structured)
```
AI-powered answer. Returns: cited response, source URLs (3-5), confidence 
score. Supports: factual queries, current events, research. 
e.g., "What happened at the Fed meeting yesterday?"
```

### Variant 3 (Contextual — Recommended)
```
Use when you need a factual answer with sourced citations. Queries the web 
in real-time and synthesizes a response with URLs and supporting quotes. 
Best for research, fact-checking, and current events.
```

**Twig score after:** B (72/100)
- Intent match: 78 (matches "research", "fact-check", "find information" queries)
- Specificity: 71 (output format, use cases, examples all present)
- Selectability: 68 (LLM now has enough context to choose this over alternatives)

## Revenue impact

Agents who previously skipped `exa/answer` (because they couldn't tell what it did) 
now select it for research tasks. The description is the selection signal.
