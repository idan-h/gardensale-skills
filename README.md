# gardensale-skills

AI agent skills for publishing [GardenSale](https://gardensale.eu) catalog items to online marketplaces.

Works with Claude Code, Cursor, GitHub Copilot, Windsurf, OpenCode, Codex, Antigravity, and Gemini CLI.

## Usage

### Install a skill (CLI platforms)

```bash
npx @gardensale/skills add pt-site-upload -a claude-code
```

### List available skills

```bash
npx @gardensale/skills list
```

### Supported platforms (`-a` flag)

| Platform | Flag | Skills directory |
|---|---|---|
| Claude Code | `claude-code` | `.claude/skills/` |
| Cursor | `cursor` | `.cursor/skills/` |
| GitHub Copilot | `github-copilot` | `.github/skills/` |
| Windsurf | `windsurf` | `.windsurf/skills/` |
| OpenCode | `opencode` | `.opencode/skills/` |
| Codex | `codex` | `.agents/skills/` |
| Antigravity | `antigravity` | `.antigravity/skills/` |
| Gemini CLI | `gemini-cli` | `.gemini/skills/` |

For **Claude Desktop**, **Claude.ai**, and **ChatGPT** — download the skill ZIP from the [GardenSale Skills page](https://gardensale.eu/skills) and upload it via Customize → Skills.

## Available Skills

| Skill | Country | Platforms | Description |
|---|---|---|---|
| `pt-site-upload` | Portugal | OLX, CustoJusto, Facebook Marketplace | Publish catalog items to Portuguese marketplaces |

## Adding a New Skill

1. **Create the skill folder:**
   ```
   skills/{skill-name}/
   ├── SKILL.md          # The skill content
   ├── metadata.json     # Skill metadata
   └── references/       # Optional: platform docs, field specs
   ```

2. **Write `SKILL.md`** — the skill content that guides the AI agent. Include:
   - Description of what the skill does
   - Which MCP tools to use (`list_catalogs`, `list_items`, `get_item`)
   - Per-platform workflows (URLs, field mappings, character limits)
   - Image URL pattern: `{POCKETBASE_URL}/api/files/items/{id}/{filename}`
   - What to ask the user (location, phone, confirmation)

3. **Create `metadata.json`:**
   ```json
   {
     "name": "your-skill-name",
     "description": "Short description",
     "country": "xx",
     "platforms": ["Platform1", "Platform2"],
     "language": "en",
     "version": "1.0.0"
   }
   ```

4. **Bump version** in the root `package.json`.

5. **Push to `main`** — GitHub Actions will auto-publish to npm.

## Updating the GardenSale /skills page

After adding a skill to this package:

1. Add the country + skill entry to `SKILLS_BY_COUNTRY` in `frontend/src/pages/SkillsPage.tsx`
2. Add the description translation key to `frontend/src/i18n/translations.ts` (all 4 languages)

## Testing locally

```bash
# Test the CLI directly:
node bin/cli.js list
node bin/cli.js add pt-site-upload -a claude-code

# Or test via npx (after npm link):
npm link
npx @gardensale/skills list
npx @gardensale/skills add pt-site-upload -a claude-code
```

## License

MIT
