# pt-site-upload

Publish Gardensale catalog items to Portuguese marketplaces via browser automation.

## How It Works

1. Fetches your catalog items via the Gardensale MCP server
2. Downloads item images locally
3. Infers the best marketplace category from item title/description
4. Controls a real browser (via `@playwright/mcp`) to fill forms, upload images, and post listings
5. Includes stealth patches to avoid bot detection

## Supported Platforms

| Marketplace | URL | Status |
|---|---|---|
| OLX Portugal | https://www.olx.pt/adding/ | Untested |
| Facebook Marketplace | https://www.facebook.com/marketplace/create/item | Untested |

## Tested On

| AI Agent Platform | MCP Auto-Config | Status |
|---|---|---|
| Claude Code (Windows) | `.claude.json` top-level `mcpServers` | Working |
| Claude Code (macOS/Linux) | `.claude.json` top-level `mcpServers` | Untested |
| Cursor | `.cursor/mcp.json` | Untested |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` | Untested |
| GitHub Copilot | `.vscode/mcp.json` | Untested |
| Gemini CLI | No MCP auto-config | Untested |
| Codex | No MCP auto-config | Untested |

## Requirements

- `@playwright/mcp` (auto-configured by the CLI installer)
- Chrome browser installed
- Gardensale MCP server connected (for catalog data)

## Files

```
pt-site-upload/
  SKILL.md           # Skill instructions for the AI agent
  mcp.json           # Playwright MCP server config (used by CLI installer)
  metadata.json      # Skill metadata
  README.md          # This file
  references/
    olx-pt.md        # OLX Portugal category mappings and field specs
    fb-marketplace.md # Facebook Marketplace category mappings
  resources/
    stealth.js       # Browser anti-detection init-script
```

## Known Issues

- On Windows, `npx` must be wrapped with `cmd /c` — the CLI handles this automatically
- OLX and Facebook may require manual login on first use — the skill will wait for you
- CAPTCHAs must be solved manually — the skill detects them and pauses
