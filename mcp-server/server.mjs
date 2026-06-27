// ---------------------------------------------------------------------------
// 4D Ops — a tiny remote MCP server (Streamable HTTP transport).
//
// This is a HELLO-WORLD to learn the mechanics. It exposes two toy tools
// (`greet`, `add`). Later we replace/extend them with real tools like
// `appendOrder` / `listRecentOrders` backed by the Google Sheets API.
//
// Run it:        npm install && npm start      (listens on http://localhost:8787/mcp)
// Add to Claude: claude mcp add --transport http fourd-ops http://localhost:8787/mcp
// Make it public (for web sessions): put it behind a tunnel or deploy it, then
// point Claude at the public https URL. See README.md.
// ---------------------------------------------------------------------------

import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

// Optional shared secret. If MCP_TOKEN is set, clients must send
// `Authorization: Bearer <token>`. Leave unset for local testing.
const TOKEN = process.env.MCP_TOKEN || '';
const PORT = process.env.PORT || 8787;

// Build a fresh MCP server instance. We register the server's TOOLS here.
function buildServer() {
  const server = new McpServer({ name: 'fourd-ops', version: '0.1.0' });

  // Tool 1 — proves the wiring works.
  server.registerTool(
    'greet',
    {
      description: 'Say hello to someone (smoke test for the MCP server).',
      inputSchema: z.object({ name: z.string().describe('Who to greet') })
    },
    async ({ name }) => ({
      content: [{ type: 'text', text: `Hello, ${name}! 👋 Your MCP server is working.` }]
    })
  );

  // Tool 2 — shows typed numeric input/output.
  server.registerTool(
    'add',
    {
      description: 'Add two numbers and return the sum.',
      inputSchema: z.object({ a: z.number(), b: z.number() })
    },
    async ({ a, b }) => ({ content: [{ type: 'text', text: String(a + b) }] })
  );

  // 👉 NEXT STEP — your real Google Sheets tool goes here, e.g.:
  // server.registerTool('appendOrder',
  //   { description: 'Append an order row to the 4D orders sheet.',
  //     inputSchema: z.object({ id: z.string(), name: z.string(), phone: z.string(),
  //       address: z.string(), city: z.string(), total: z.number() }) },
  //   async (order) => { /* call Google Sheets API with a service account */ });

  return server;
}

const app = express();
app.use(express.json());

// MCP Streamable HTTP endpoint (stateless: one server+transport per request).
app.post('/mcp', async (req, res) => {
  if (TOKEN && req.headers.authorization !== `Bearer ${TOKEN}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => { try { transport.close(); server.close(); } catch (_) {} });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('MCP request error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'server error' });
  }
});

// Stateless mode keeps no sessions, so the SSE GET stream isn't used.
app.get('/mcp', (_req, res) => res.status(405).json({ error: 'Method Not Allowed (stateless server)' }));

// Friendly root so you can eyeball that it's running.
app.get('/', (_req, res) => res.type('text').send('4D Ops MCP server is running. POST /mcp'));

app.listen(PORT, () => {
  console.log(`4D Ops MCP server listening on http://localhost:${PORT}/mcp`);
  if (!TOKEN) console.log('(no MCP_TOKEN set — anyone who can reach this URL can call the tools)');
});
