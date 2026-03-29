#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

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
    console.log(`  ${skill.name}`)
    console.log(`    ${skill.description}`)
    console.log(`    Country: ${skill.country}  Platforms: ${platforms}`)
    console.log()
  }
}

function addSkill(skillName, agent) {
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

  const targetDir = path.join(process.cwd(), agentPath, skillName)
  fs.mkdirSync(targetDir, { recursive: true })

  const targetFile = path.join(targetDir, 'SKILL.md')
  fs.copyFileSync(skillFile, targetFile)

  // Copy references if they exist
  const refsDir = path.join(skillDir, 'references')
  if (fs.existsSync(refsDir)) {
    const targetRefs = path.join(targetDir, 'references')
    fs.mkdirSync(targetRefs, { recursive: true })
    for (const file of fs.readdirSync(refsDir)) {
      fs.copyFileSync(path.join(refsDir, file), path.join(targetRefs, file))
    }
  }

  console.log(`\n  Installed "${skillName}" for ${agent}`)
  console.log(`  Location: ${path.relative(process.cwd(), targetFile)}\n`)
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
  addSkill(skillName, agent)
} else {
  console.log(`
gardensale-skills — AI agent skills for GardenSale

Commands:
  add <skill> -a <platform>   Install a skill for a platform
  list                        List available skills

Platforms: ${Object.keys(AGENT_PATHS).join(', ')}

Example:
  npx gardensale-skills add pt-site-upload -a claude-code
`)
}
