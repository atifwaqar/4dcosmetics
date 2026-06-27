# 4D Ops MCP server (hello-world → Google Sheets)

A tiny [Model Context Protocol](https://modelcontextprotocol.io) server, built
**remote-first** (Streamable HTTP) so it can be used from Claude Code on the web
*and* the desktop/CLI. It starts with two toy tools (`greet`, `add`); we'll grow
it into real order tools backed by Google Sheets.

> Note: this was written but **not run** in the authoring sandbox (no npm there).
> Run it locally as below; if any API name differs, it'll be a small fix against
> your installed `@modelcontextprotocol/sdk` version.

## 1. Run it locally

```bash
cd mcp-server
npm install
npm start          # → 4D Ops MCP server listening on http://localhost:8787/mcp
```

Sanity check in another terminal: `curl http://localhost:8787/` should say it's running.

## 2. Connect it to Claude Code (CLI/desktop)

```bash
claude mcp add --transport http fourd-ops http://localhost:8787/mcp
```

Then start `claude`, and ask: *"use the fourd-ops greet tool with name Atif."*
You should see it call `mcp__fourd-ops__greet` and reply "Hello, Atif! 👋".
(Approve the server on first use.)

## 3. Use it from Claude Code on the **web**

Web sessions can't spawn local processes, so the server must be reachable at a
**public https URL**. Two ways:

**a) Quick tunnel (for testing)** — keep `npm start` running, then:
```bash
# pick one
npx cloudflared tunnel --url http://localhost:8787
ngrok http 8787
```
Copy the public `https://…` URL it prints; your MCP endpoint is `<that-url>/mcp`.

**b) Deploy it** (for keeps) — any Node host works: Render, Railway, Fly.io,
a small VPS, etc. Set `PORT` (the host provides it) and a `MCP_TOKEN` secret.

Then register it for this repo by committing a `.mcp.json` at the project root:
```json
{
  "mcpServers": {
    "fourd-ops": {
      "type": "http",
      "url": "https://YOUR-PUBLIC-URL/mcp",
      "headers": { "Authorization": "Bearer ${MCP_TOKEN}" }
    }
  }
}
```
`${MCP_TOKEN}` is expanded from an environment variable in the Claude Code
environment (set it as a secret there) — so the token isn't hard-coded in git.

## 4. Security

- Set `MCP_TOKEN` (env var) once you expose it publicly; clients must then send
  `Authorization: Bearer <token>`. Without it, anyone who finds the URL can call
  the tools.
- All tool calls still require your approval in Claude Code's permission prompt.

## 5. Next step — the Google Sheets tools

Replace the toy tools with real ones (`appendOrder`, `listRecentOrders`,
`createOrdersSheet`) backed by the Google Sheets API. Auth uses a **Google
service account** (a JSON key you create once and share the sheet with the
service account's email) — no interactive login. The key lives only on the
server (env var / secret), never in the browser or git. See `server.mjs` for
the marked spot where these tools go.

## The three MCP building blocks (for reference)

- **Tools** — functions the model can call (what we use here).
- **Resources** — read-only data the server can expose (e.g. a file/schema).
- **Prompts** — reusable prompt templates the user can invoke.
