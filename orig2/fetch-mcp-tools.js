#!/usr/bin/env node
/*
  Fetch full list of MCP tools from Atlassian Remote MCP Server and save JSON spec.

  Default server endpoints (from Atlassian docs):
    - SSE stream:   https://mcp.atlassian.com/v1/sse
    - JSON-RPC POST: https://mcp.atlassian.com/v1

  Authentication:
    Provide headers via environment variables or CLI:
      - MCP_TOKEN=...  -> adds Authorization: Bearer <token>
      - Or arbitrary headers via env vars starting with MCP_HDR_ (e.g. MCP_HDR_X-API-Key=abc)
      - Or --header "Header-Name: value" (can be repeated)

  Usage examples:
    node orig2/fetch-mcp-tools.js \
      --base https://mcp.atlassian.com/v1 \
      --sse https://mcp.atlassian.com/v1/sse \
      --out ./orig2/mcp-tools-spec.json \
      --header "Authorization: Bearer <YOUR_TOKEN>"

    # Using env vars only (recommended)
    set MCP_BASE=https://mcp.atlassian.com/v1
    set MCP_SSE=https://mcp.atlassian.com/v1/sse
    set MCP_TOKEN=your_token_here
    node orig2/fetch-mcp-tools.js
*/

import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function parseCliArgs (argv) {
  const args = { headers: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--base') {
      args.base = argv[++i];
    } else if (a === '--sse') {
      args.sse = argv[++i];
    } else if (a === '--post') {
      args.post = argv[++i];
    } else if (a === '--out') {
      args.out = argv[++i];
    } else if (a === '--timeout') {
      args.timeout = parseInt(argv[++i] || '15000', 10);
    } else if (a === '--header' || a === '-H') {
      args.headers.push(argv[++i]);
    } else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

function buildHeadersFromEnvAndArgs (cli) {
  const headers = { 'Content-Type': 'application/json' };

  // Token via env var (support multiple variable names like in orig)
  const token = process.env.MCP_TOKEN || process.env.ATLASSIAN_MCP_TOKEN || process.env.ATLASSIAN_ACCESS_TOKEN;
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Arbitrary headers via MCP_HDR_*
  for (const [k, v] of Object.entries(process.env)) {
    if (k.startsWith('MCP_HDR_') && v) {
      const name = k.substring('MCP_HDR_'.length).replaceAll('_', '-');
      headers[name] = v;
    }
  }

  // CLI headers
  for (const h of cli.headers || []) {
    const idx = h.indexOf(':');
    if (idx > 0) {
      const name = h.substring(0, idx).trim();
      const value = h.substring(idx + 1).trim();
      if (name && value) headers[name] = value;
    }
  }

  return headers;
}

function resolveConfig () {
  const cli = parseCliArgs(process.argv);
  if (cli.help) {
    console.log('Usage: node orig2/fetch-mcp-tools.js [--base URL] [--sse URL] [--out PATH] [-H "Name: value"] [--timeout ms]');
    process.exit(0);
  }

  const base = cli.base || process.env.MCP_BASE || 'https://mcp.atlassian.com/v1';
  const sseUrl = cli.sse || process.env.MCP_SSE || (base.replace(/\/$/, '') + '/sse');
  const postUrl = cli.post || process.env.MCP_POST || base.replace(/\/$/, '');
  const outFile = cli.out || process.env.MCP_OUT || path.join('orig2', 'mcp-tools-spec.json');
  const timeoutMs = Number.isFinite(cli.timeout) ? cli.timeout : (parseInt(process.env.MCP_TIMEOUT || '20000', 10));
  const headers = buildHeadersFromEnvAndArgs(cli);

  return { base, sseUrl, postUrl, outFile, timeoutMs, headers };
}

async function openSseStream (url, headers, onMessage, onError) {
  const controller = new AbortController();
  // Build SSE-specific headers
  const sseHeaders = { ...headers };
  // Remove JSON content type for SSE GET
  if ('Content-Type' in sseHeaders) delete sseHeaders['Content-Type'];
  // Ensure proper SSE headers
  if (!sseHeaders['Accept']) sseHeaders['Accept'] = 'text/event-stream';
  if (!sseHeaders['Cache-Control']) sseHeaders['Cache-Control'] = 'no-cache';
  if (!sseHeaders['Connection']) sseHeaders['Connection'] = 'keep-alive';

  const res = await fetch(url, { headers: sseHeaders, signal: controller.signal });
  if (!res.ok) throw new Error(`SSE connect failed: ${res.status} ${res.statusText}`);
  if (!res.body) throw new Error('SSE response has no body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const rawEvent = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const evt = parseSseEvent(rawEvent);
          if (evt && evt.data) {
            try {
              const data = JSON.parse(evt.data);
              onMessage?.(data, evt);
            } catch (_) {
              // Ignore non-JSON data frames
            }
          }
        }
      }
    } catch (err) {
      onError?.(err);
    }
  })();

  return { close: () => controller.abort() };
}

function parseSseEvent (chunk) {
  const lines = chunk.split(/\r?\n/);
  const evt = { event: 'message', data: '' };
  for (const line of lines) {
    if (line.startsWith('event:')) {
      evt.event = line.slice(6).trim();
    } else if (line.startsWith('data:')) evt.data += (evt.data ? '\n' : '') + line.slice(5).trim();
    // ignore id:, retry: for now
  }
  return evt;
}

function newId () {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function postJsonRpc (url, headers, method, params, id = undefined) {
  const body = { jsonrpc: '2.0', id: id ?? newId(), method, params };
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const json = await res.json();
    return { response: json, status: res.status };
  } else {
    const text = await res.text();
    return { response: text, status: res.status };
  }
}

function extractToolsFromResult (obj) {
  if (!obj) return null;
  if (obj.result && obj.result.tools) return obj.result.tools;
  if (obj.tools) return obj.tools; // some servers may return directly
  return null;
}

async function fetchToolsSpec () {
  const cfg = resolveConfig();
  const { sseUrl, postUrl, outFile, timeoutMs, headers } = cfg;

  console.log(`[MCP] Connecting SSE: ${sseUrl}`);
  const responses = new Map();
  let streamError = null;

  // Start SSE stream to receive async results (if server uses SSE for responses)
  let sse;
  try {
    sse = await openSseStream(sseUrl, headers, (data) => {
      const id = data?.id || data?.result?.id || data?.meta?.correlationId;
      if (id) responses.set(id, data);
      // Also store last message under special key
      responses.set('__last__', data);
    }, (err) => {
      streamError = err instanceof Error ? err : new Error(String(err));
    });
  } catch (err) {
    console.warn(`[MCP] SSE connection failed: ${err instanceof Error ? err.message : String(err)}. Will try POST fallback.`);
  }

  // Send list tools request
  const reqId = newId();
  console.log(`[MCP] Requesting tools/list (id=${reqId}) via POST ${postUrl}`);
  const { response: postResp } = await postJsonRpc(postUrl, headers, 'tools/list', {}, reqId);

  // Try to extract tools from direct POST response first
  let tools = extractToolsFromResult(postResp);

  // If not present, wait for SSE message with matching id
  if (!tools) {
    const start = Date.now();
    while ((Date.now() - start) < timeoutMs) {
      const msg = responses.get(reqId) || responses.get('__last__');
      if (msg) {
        tools = extractToolsFromResult(msg);
        if (tools) break;
      }
      await sleep(100);
    }
  }

  if (!tools) {
    // As a last resort, if the server returned a full JSON string in POST, log it for user
    throw new Error('Failed to obtain tools list from server via POST or SSE. Last POST response: ' + (typeof postResp === 'string' ? postResp.slice(0, 2000) : JSON.stringify(postResp)
      .slice(0, 2000)));
  }

  // Optional: Fetch extra metadata for each tool via tools/call? Not needed here. We save the full tool specs we have.
  const spec = {
    source: {
      sseUrl,
      postUrl,
      fetchedAt: new Date().toISOString(),
    },
    tools,
  };

  // Ensure directory exists
  const dir = path.dirname(outFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(outFile, JSON.stringify(spec, null, 2), 'utf-8');
  console.log(`[MCP] Saved ${tools.length} tools to ${outFile}`);

  // Close SSE if opened
  try { sse?.close?.(); } catch {}

  return spec;
}

const { url } = import.meta;
console.log(url);
// file:///D:/work/PROJ/_cur/mcp-atlassian-ts/orig2/fetch-mcp-tools.js
// file://D:/work/PROJ/_cur/mcp-atlassian-ts/orig2/fetch-mcp-tools.js
if (url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  fetchToolsSpec().catch(err => {
    console.error('[MCP] Error:', err?.message || err);
    process.exitCode = 1;
  });
}

export default fetchToolsSpec;
