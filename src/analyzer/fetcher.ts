/**
 * Twig Tool Fetcher
 * Fetches MCP tool definitions from a running MCP server or local schema file.
 */

import type { ToolDefinition } from './scorer.js';

export interface FetchResult {
  source: string;
  tools: ToolDefinition[];
  error?: string;
}

export async function fetchMCPTools(url: string): Promise<FetchResult> {
  // Try MCP server introspection endpoints
  const endpoints = [
    url.replace(/\/$/, '') + '/mcp',
    url.replace(/\/$/, '') + '/tools',
    url.replace(/\/$/, '') + '/mcp/tools',
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', params: {}, id: 1 }),
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json() as { result?: { tools?: ToolDefinition[] } };
        const tools = data?.result?.tools ?? [];
        if (tools.length > 0) {
          return { source: endpoint, tools };
        }
      }
    } catch {
      // try next endpoint
    }
  }

  // Try as direct JSON schema
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json() as unknown;
      const tools = extractTools(data);
      if (tools.length > 0) return { source: url, tools };
    }
  } catch {
    // fall through
  }

  return { source: url, tools: [], error: `Could not fetch tools from ${url}` };
}

export async function fetchAgentCard(url: string): Promise<FetchResult> {
  const wellKnown = url.includes('.well-known/agent.json')
    ? url
    : url.replace(/\/$/, '') + '/.well-known/agent.json';

  try {
    const res = await fetch(wellKnown, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { source: wellKnown, tools: [], error: `HTTP ${res.status}` };

    const card = await res.json() as { skills?: Array<{ id: string; name: string; description: string; inputSchema?: ToolDefinition['inputSchema'] }> };
    const tools: ToolDefinition[] = (card.skills ?? []).map(s => ({
      name: s.id ?? s.name,
      description: s.description ?? '',
      inputSchema: s.inputSchema,
    }));

    return { source: wellKnown, tools };
  } catch (e) {
    return { source: wellKnown, tools: [], error: String(e) };
  }
}

function extractTools(data: unknown): ToolDefinition[] {
  if (typeof data !== 'object' || data === null) return [];
  const obj = data as Record<string, unknown>;

  // OpenAPI-style
  if (obj['paths']) {
    return Object.entries(obj['paths'] as Record<string, unknown>).map(([path, methods]) => ({
      name: path,
      description: (methods as Record<string, { description?: string }>)['post']?.description
        ?? (methods as Record<string, { description?: string }>)['get']?.description
        ?? '',
    }));
  }

  // Tools array
  if (Array.isArray(obj['tools'])) {
    return (obj['tools'] as ToolDefinition[]);
  }

  return [];
}
