#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const os = require('os')

const AGENT_PATHS = {
  'claude-code':     '.claude/skills',
  'cursor':          '.cursor/skills',
  'gemini-cli':      '.gemini/skills',
  'antigravity':     '.antigravity/skills',
  'codex':           '.agents/skills',
  'opencode':        '.opencode/skills',
  'windsurf':        '.windsurf/skills',
  'github-copilot':  '.github/skills',
}

const MCP_CONFIG_PATHS = {
  'claude-code': {
    local: '.mcp.json',
    global: path.join(os.homedir(), '.claude.json'),
    key: 'mcpServers',
  },
  'cursor': {
    local: '.cursor/mcp.json',
    global: path.join(os.homedir(), '.cursor', 'mcp.json'),
    key: 'mcpServers',
  },
  'windsurf': {
    global: path.join(os.homedir(), '.codeium', 'windsurf', 'mcp_config.json'),
    key: 'mcpServers',
  },
  'github-copilot': {
    local: '.vscode/mcp.json',
    key: 'servers',
  },
}

const GARDENSALE_URLS = {
  prod: 'https://mcp.gardensale.eu',
  dev: 'http://localhost:3001',
}

const SKILLS_DIR = path.join(__dirname, '..', 'skills')

function getAvailableSkills() {
  const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
  const skills = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const metaPath = path.join(SKILLS_DIR, entry.name, 'metadata.json')
    if (!fs.existsSync(metaPath)) continue
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
    skills.push({ dir: entry.name, ...meta })
  }
  return skills
}

function listSkills() {
  const skills = getAvailableSkills()
  if (skills.length === 0) {
    console.log('No skills available.')
    return
  }
  console.log('\nAvailable skills:\n')
  for (const skill of skills) {
    const platforms = skill.platforms ? skill.platforms.join(', ') : ''
    const mcpDeps = skill.mcpDependencies ? skill.mcpDependencies.join(', ') : 'none'
    console.log(`  ${skill.name}`)
    console.log(`    ${skill.description}`)
    console.log(`    Country: ${skill.country}  Platforms: ${platforms}`)
    console.log(`    MCP dependencies: ${mcpDeps}`)
    console.log()
  }
}

function copyDirRecursive(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return false
  fs.mkdirSync(destDir, { recursive: true })
  for (const file of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, file.name)
    const destPath = path.join(destDir, file.name)
    if (file.isDirectory()) {
      copyDirRecursive(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
  return true
}

function toForwardSlashes(p) {
  return p.replace(/\\/g, '/')
}

function configureMcp(skillDir, targetDir, agent, isDev, isGlobal) {
  const mcpJsonPath = path.join(skillDir, 'mcp.json')
  if (!fs.existsSync(mcpJsonPath)) return

  const mcpConfig = MCP_CONFIG_PATHS[agent]
  if (!mcpConfig) {
    console.log(`\n  Note: MCP auto-configuration is not supported for "${agent}".`)
    console.log(`  See the skill's mcp.json for the required MCP server config.\n`)
    return
  }

  // Resolve the resources directory path (forward slashes for cross-platform compat)
  const resourcesDir = toForwardSlashes(path.resolve(path.join(targetDir, 'resources')))

  // Read and resolve placeholders in the skill's mcp.json
  let mcpRaw = fs.readFileSync(mcpJsonPath, 'utf-8')
  mcpRaw = mcpRaw.replace(/\{RESOURCES_DIR\}/g, resourcesDir)
  mcpRaw = mcpRaw.replace(/\{GARDENSALE_URL\}/g, isDev ? GARDENSALE_URLS.dev : GARDENSALE_URLS.prod)
  const skillMcp = JSON.parse(mcpRaw)

  // Determine which config file to use: -g writes to global, otherwise local (project-level)
  let configPath = null
  if (isGlobal && mcpConfig.global) {
    configPath = mcpConfig.global
  } else if (!isGlobal && mcpConfig.local) {
    configPath = path.resolve(process.cwd(), mcpConfig.local)
  } else {
    // Fallback: use whichever is available
    configPath = mcpConfig.global || (mcpConfig.local && path.resolve(process.cwd(), mcpConfig.local))
  }
  if (!configPath) return

  // Read existing config or start fresh
  let config = {}
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    } catch (err) {
      console.log(`\n  Warning: Could not parse ${configPath} (may contain comments).`)
      console.log(`  Please manually add the MCP server config from the skill's mcp.json.\n`)
      return
    }
  } else {
    // Ensure parent directory exists
    fs.mkdirSync(path.dirname(configPath), { recursive: true })
  }

  // Merge MCP servers under the correct key
  const key = mcpConfig.key
  const sourceKey = 'mcpServers' // always mcpServers in our mcp.json

  if (!config[key]) config[key] = {}

  const isWindows = process.platform === 'win32'
  const servers = skillMcp[sourceKey] || {}
  for (const [name, serverConfig] of Object.entries(servers)) {
    // On Windows, npx needs to be run through cmd /c
    if (isWindows && serverConfig.command === 'npx') {
      serverConfig.args = ['/c', 'npx', ...serverConfig.args]
      serverConfig.command = 'cmd'
    }
    if (config[key][name]) {
      console.log(`  Updated MCP server "${name}" in ${path.relative(process.cwd(), configPath)}`)
    } else {
      console.log(`  Added MCP server "${name}" to ${path.relative(process.cwd(), configPath)}`)
    }
    config[key][name] = serverConfig
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n')
}

function addSkill(skillName, agent, isDev, isGlobal) {
  if (!skillName) {
    console.error('Error: skill name required.\nUsage: gardensale-skills add <skill-name> -a <platform>')
    process.exit(1)
  }

  if (!agent) {
    console.error('Error: platform required. Use -a <platform>.')
    console.error('Platforms: ' + Object.keys(AGENT_PATHS).join(', '))
    process.exit(1)
  }

  const agentPath = AGENT_PATHS[agent]
  if (!agentPath) {
    console.error(`Error: unknown platform "${agent}".`)
    console.error('Supported: ' + Object.keys(AGENT_PATHS).join(', '))
    process.exit(1)
  }

  const skillDir = path.join(SKILLS_DIR, skillName)
  const skillFile = path.join(skillDir, 'SKILL.md')
  if (!fs.existsSync(skillFile)) {
    console.error(`Error: skill "${skillName}" not found.`)
    console.error('Run "gardensale-skills list" to see available skills.')
    process.exit(1)
  }

  const baseDir = isGlobal ? os.homedir() : process.cwd()
  const targetDir = path.join(baseDir, agentPath, skillName)
  fs.mkdirSync(targetDir, { recursive: true })

  // Copy SKILL.md
  fs.copyFileSync(skillFile, path.join(targetDir, 'SKILL.md'))

  // Copy references/
  copyDirRecursive(path.join(skillDir, 'references'), path.join(targetDir, 'references'))

  // Copy resources/
  copyDirRecursive(path.join(skillDir, 'resources'), path.join(targetDir, 'resources'))

  console.log(`\n  Installed "${skillName}" for ${agent}`)
  console.log(`  Location: ${path.relative(process.cwd(), path.join(targetDir, 'SKILL.md'))}`)

  // Auto-configure MCP servers
  configureMcp(skillDir, targetDir, agent, isDev, isGlobal)

  console.log()
}

// Parse args
const args = process.argv.slice(2)
const command = args[0]

if (command === 'list') {
  listSkills()
} else if (command === 'add') {
  const skillName = args[1]
  const agentFlagIdx = args.indexOf('-a')
  const agent = agentFlagIdx !== -1 ? args[agentFlagIdx + 1] : null
  const isDev = args.includes('--dev')
  const isGlobal = args.includes('-g') || args.includes('--global')
  addSkill(skillName, agent, isDev, isGlobal)
} else {
  console.log(`
gardensale-skills — AI agent skills for GardenSale

Commands:
  add <skill> -a <platform> [-g] [--dev]   Install a skill for a platform
  list                                    List available skills

Options:
  -g, --global   Install to home directory (global, available in all projects)
  --dev          Use local dev MCP URLs (default: production)

Platforms: ${Object.keys(AGENT_PATHS).join(', ')}

Example:
  npx gardensale-skills add pt-site-upload -a claude-code -g
  npx gardensale-skills add pt-site-upload -a claude-code -g --dev
`)
}
