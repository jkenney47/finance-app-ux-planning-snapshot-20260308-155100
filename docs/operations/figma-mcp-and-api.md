# Figma MCP + API Setup

Use MCP and REST API together:

- MCP is used by Codex tooling (`mcp__figma__...` tools).
- REST API is used by scripts or custom integrations (`https://api.figma.com/v1/...`).

## 1) Configure MCP (Codex)

In Codex MCP settings for Figma remote server:

- URL: `https://mcp.figma.com/mcp`
- Bearer token env var: `FIGMA_OAUTH_TOKEN`
- Header: `X-Figma-Region` = `us-east-1` (if required by your account region)

Then restart Codex fully.

## 2) Configure REST API Token

Set a direct API token in `.env.local`:

```bash
FIGMA_ACCESS_TOKEN=your_figma_api_token
```

Notes:

- `FIGMA_ACCESS_TOKEN` is preferred for `/v1/*` API calls.
- MCP OAuth tokens are not always accepted by REST API endpoints.

## 3) Verify API Access

Run:

```bash
npm run figma:api:check
```

Success output includes your `id`, `handle`, and `email`.

## 4) UI Sync After Every UI Change (Required)

This repo requires Figma to stay in sync for every UI change.
Use `docs/ux/ui-development-workflow.md` as the canonical workflow.

Baseline-capture sync path:

1. Ensure the app is running on Expo web (capture source).
2. Capture the affected routes into the baseline Figma file using MCP capture.
3. Update `docs/ux/figma-node-map.md` with the new `nodeId` values and explicit capture notes.

If capture is blocked, fall back to iOS screenshots and record the sync as pending in the active plan.

## 5) Troubleshooting

- `Invalid token`: token type is wrong for REST API. Generate/use a direct API token and set `FIGMA_ACCESS_TOKEN`.
- `Auth required` in MCP tools: MCP env var/header mismatch; confirm `FIGMA_OAUTH_TOKEN` and region header.
- Timeout: network/proxy issue to `api.figma.com` or MCP endpoint.
