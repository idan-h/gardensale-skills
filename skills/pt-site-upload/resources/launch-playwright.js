#!/usr/bin/env node

// Lazy CDP proxy for Playwright MCP.
// Handles initialize + tools/list ourselves with hardcoded definitions.
// Only spawns Chrome + Playwright MCP on first tools/call.

const { spawn } = require('child_process')
const readline = require('readline')
const path = require('path')
const net = require('net')
const fs = require('fs')
const https = require('https')
const http = require('http')

const os = require('os')

const CDP_PORT = 9222
const NPX = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const CHROME_DATA_DIR = path.join(os.tmpdir(), 'playwright-cdp-chrome')

// ── Chrome discovery ──────────────────────────────────────────────

const CHROME_PATHS = {
  win32: [
    path.join(process.env['PROGRAMFILES'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env['LOCALAPPDATA'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ],
  darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
  linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium-browser'],
}

function findChrome() {
  for (const p of (CHROME_PATHS[process.platform] || CHROME_PATHS.linux)) {
    if (fs.existsSync(p)) return p
  }
  return null
}

function checkPort(port) {
  return new Promise((resolve) => {
    const s = new net.Socket()
    s.setTimeout(600)
    s.once('connect', () => { s.destroy(); resolve(true) })
    s.once('error', () => resolve(false))
    s.once('timeout', () => { s.destroy(); resolve(false) })
    s.connect(port, '127.0.0.1')
  })
}

async function waitForPort(port) {
  for (let i = 0; i < 30; i++) {
    if (await checkPort(port)) return true
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

// ── JSON-RPC helpers ──────────────────────────────────────────────

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n')
}

function sendError(id, code, message) {
  send({ jsonrpc: '2.0', id, error: { code, message } })
}

// ── Hardcoded tool definitions ────────────────────────────────────
// Mirrors @playwright/mcp tools so we can respond to tools/list without spawning anything.

const TOOLS = [
  { name: 'browser_click', description: 'Perform click on a web page', inputSchema: { type: 'object', properties: { ref: { type: 'string', description: 'Exact target element reference from the page snapshot' }, element: { type: 'string', description: 'Human-readable element description used to obtain permission to interact with the element' }, button: { type: 'string', enum: ['left', 'right', 'middle'], description: 'Button to click, defaults to left' }, doubleClick: { type: 'boolean', description: 'Whether to perform a double click instead of a single click' }, modifiers: { type: 'array', items: { type: 'string', enum: ['Alt', 'Control', 'ControlOrMeta', 'Meta', 'Shift'] }, description: 'Modifier keys to press' } }, required: ['ref'] } },
  { name: 'browser_close', description: 'Close the page', inputSchema: { type: 'object', properties: {} } },
  { name: 'browser_console_messages', description: 'Returns all console messages', inputSchema: { type: 'object', properties: { filename: { type: 'string', description: 'Filename to save the console messages to. If not provided, messages are returned as text.' }, level: { type: 'string', enum: ['error', 'warning', 'info', 'debug'], default: 'info', description: 'Level of the console messages to return.' } }, required: ['level'] } },
  { name: 'browser_drag', description: 'Perform drag and drop between two elements', inputSchema: { type: 'object', properties: { startRef: { type: 'string', description: 'Exact source element reference from the page snapshot' }, startElement: { type: 'string', description: 'Human-readable source element description' }, endRef: { type: 'string', description: 'Exact target element reference from the page snapshot' }, endElement: { type: 'string', description: 'Human-readable target element description' } }, required: ['startElement', 'startRef', 'endElement', 'endRef'] } },
  { name: 'browser_evaluate', description: 'Evaluate JavaScript expression on page or element', inputSchema: { type: 'object', properties: { 'function': { type: 'string', description: '() => { /* code */ } or (element) => { /* code */ } when element is provided' }, ref: { type: 'string', description: 'Exact target element reference from the page snapshot' }, element: { type: 'string', description: 'Human-readable element description' } }, required: ['function'] } },
  { name: 'browser_file_upload', description: 'Upload one or multiple files', inputSchema: { type: 'object', properties: { paths: { type: 'array', items: { type: 'string' }, description: 'The absolute paths to the files to upload.' } } } },
  { name: 'browser_fill_form', description: 'Fill multiple form fields', inputSchema: { type: 'object', properties: { fields: { type: 'array', items: { type: 'object', properties: { name: { type: 'string', description: 'Human-readable field name' }, type: { type: 'string', enum: ['textbox', 'checkbox', 'radio', 'combobox', 'slider'], description: 'Type of the field' }, ref: { type: 'string', description: 'Exact target field reference from the page snapshot' }, value: { type: 'string', description: 'Value to fill in the field.' } }, required: ['name', 'type', 'ref', 'value'] }, description: 'Fields to fill in' } }, required: ['fields'] } },
  { name: 'browser_handle_dialog', description: 'Handle a dialog', inputSchema: { type: 'object', properties: { accept: { type: 'boolean', description: 'Whether to accept the dialog.' }, promptText: { type: 'string', description: 'The text of the prompt in case of a prompt dialog.' } }, required: ['accept'] } },
  { name: 'browser_hover', description: 'Hover over element on page', inputSchema: { type: 'object', properties: { ref: { type: 'string', description: 'Exact target element reference from the page snapshot' }, element: { type: 'string', description: 'Human-readable element description' } }, required: ['ref'] } },
  { name: 'browser_install', description: 'Install the browser specified in the config.', inputSchema: { type: 'object', properties: {} } },
  { name: 'browser_navigate', description: 'Navigate to a URL', inputSchema: { type: 'object', properties: { url: { type: 'string', description: 'The URL to navigate to' } }, required: ['url'] } },
  { name: 'browser_navigate_back', description: 'Go back to the previous page in the history', inputSchema: { type: 'object', properties: {} } },
  { name: 'browser_network_requests', description: 'Returns all network requests since loading the page', inputSchema: { type: 'object', properties: { filename: { type: 'string', description: 'Filename to save the network requests to.' }, includeStatic: { type: 'boolean', default: false, description: 'Whether to include successful static resources.' } }, required: ['includeStatic'] } },
  { name: 'browser_press_key', description: 'Press a key on the keyboard', inputSchema: { type: 'object', properties: { key: { type: 'string', description: 'Name of the key to press or a character to generate, such as ArrowLeft or a' } }, required: ['key'] } },
  { name: 'browser_resize', description: 'Resize the browser window', inputSchema: { type: 'object', properties: { width: { type: 'number', description: 'Width of the browser window' }, height: { type: 'number', description: 'Height of the browser window' } }, required: ['width', 'height'] } },
  { name: 'browser_run_code', description: 'Run Playwright code snippet', inputSchema: { type: 'object', properties: { code: { type: 'string', description: 'A JavaScript function containing Playwright code to execute.' } }, required: ['code'] } },
  { name: 'browser_select_option', description: 'Select an option in a dropdown', inputSchema: { type: 'object', properties: { ref: { type: 'string', description: 'Exact target element reference from the page snapshot' }, element: { type: 'string', description: 'Human-readable element description' }, values: { type: 'array', items: { type: 'string' }, description: 'Array of values to select in the dropdown.' } }, required: ['ref', 'values'] } },
  { name: 'browser_snapshot', description: 'Capture accessibility snapshot of the current page, this is better than screenshot', inputSchema: { type: 'object', properties: { filename: { type: 'string', description: 'Save snapshot to markdown file instead of returning it in the response.' } } } },
  { name: 'browser_tabs', description: 'List, create, close, or select a browser tab.', inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['list', 'new', 'close', 'select'], description: 'Operation to perform' }, index: { type: 'number', description: 'Tab index, used for close/select.' } }, required: ['action'] } },
  { name: 'browser_take_screenshot', description: 'Take a screenshot of the current page.', inputSchema: { type: 'object', properties: { type: { type: 'string', enum: ['png', 'jpeg'], default: 'png', description: 'Image format for the screenshot.' }, filename: { type: 'string', description: 'File name to save the screenshot to.' }, fullPage: { type: 'boolean', description: 'When true, takes a screenshot of the full scrollable page.' }, ref: { type: 'string', description: 'Exact target element reference from the page snapshot.' }, element: { type: 'string', description: 'Human-readable element description.' } }, required: ['type'] } },
  { name: 'browser_type', description: 'Type text into editable element', inputSchema: { type: 'object', properties: { ref: { type: 'string', description: 'Exact target element reference from the page snapshot' }, text: { type: 'string', description: 'Text to type into the element' }, element: { type: 'string', description: 'Human-readable element description' }, submit: { type: 'boolean', description: 'Whether to submit entered text (press Enter after)' }, slowly: { type: 'boolean', description: 'Whether to type one character at a time.' } }, required: ['ref', 'text'] } },
  { name: 'browser_wait_for', description: 'Wait for text to appear or disappear or a specified time to pass', inputSchema: { type: 'object', properties: { text: { type: 'string', description: 'The text to wait for' }, textGone: { type: 'string', description: 'The text to wait for to disappear' }, time: { type: 'number', description: 'The time to wait in seconds' } } } },
  { name: 'browser_launch', description: 'Ensure Chrome is running. Launches Chrome if it is not already running. Use this after getting ECONNREFUSED errors.', inputSchema: { type: 'object', properties: {} } },
  { name: 'download_file', description: 'Download a file from a URL to a local path. Does not require a browser.', inputSchema: { type: 'object', properties: { url: { type: 'string', description: 'The URL to download' }, dest_path: { type: 'string', description: 'Full local file path to save to (e.g. C:/images/photo.jpg)' } }, required: ['url', 'dest_path'] } },
]

// ── File download ────────────────────────────────────────────────

function downloadFile(url, destPath, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Too many redirects'))
    const client = url.startsWith('https') ? https : http
    client.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath, maxRedirects - 1).then(resolve, reject)
      }
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error(`HTTP ${res.statusCode}`))
      }
      fs.mkdirSync(path.dirname(destPath), { recursive: true })
      const file = fs.createWriteStream(destPath)
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
      file.on('error', (e) => { fs.unlink(destPath, () => {}); reject(e) })
    }).on('error', reject)
  })
}

// ── State ─────────────────────────────────────────────────────────

let child = null
let childReady = false
let pendingMessages = []
let starting = false

// ── Start Chrome + Playwright MCP ─────────────────────────────────

async function ensureChrome() {
  if (await checkPort(CDP_PORT)) return true

  const chrome = findChrome()
  if (!chrome) {
    process.stderr.write('[proxy] Chrome not found\n')
    return false
  }

  spawn(chrome, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${CHROME_DATA_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
  ], { detached: true, stdio: 'ignore' }).unref()

  if (await waitForPort(CDP_PORT)) return true
  process.stderr.write('[proxy] Chrome failed to start\n')
  return false
}

function spawnChild() {
  return new Promise((resolve, reject) => {
    const proc = spawn(NPX, [
      '@playwright/mcp@latest',
      '--cdp-endpoint', `http://127.0.0.1:${CDP_PORT}`,
      '--allow-unrestricted-file-access',
    ], { stdio: ['pipe', 'pipe', 'inherit'], shell: true })

    const childRl = readline.createInterface({ input: proc.stdout, terminal: false })

    childRl.on('line', (line) => {
      let msg
      try { msg = JSON.parse(line) } catch {}

      // Intercept our internal init response
      if (msg && msg.id === '__proxy_init__') {
        childReady = true
        resolve(proc)
        // Flush pending
        for (const p of pendingMessages) {
          proc.stdin.write(p + '\n')
        }
        pendingMessages = []
        return
      }

      // Forward everything else to parent
      process.stdout.write(line + '\n')
    })

    proc.on('exit', () => {
      child = null
      childReady = false
    })

    // Initialize the child
    proc.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: '__proxy_init__',
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'playwright-proxy', version: '1.0.0' },
      },
    }) + '\n')

    setTimeout(() => {
      if (!childReady) reject(new Error('Playwright MCP init timeout'))
    }, 30000)
  })
}

async function ensureChild() {
  if (childReady && child) return true
  if (starting) return false

  starting = true
  try {
    const ok = await ensureChrome()
    if (!ok) return false

    child = await spawnChild()

    // Send initialized notification to child
    child.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    }) + '\n')

    return true
  } catch (e) {
    process.stderr.write(`[proxy] Failed to start: ${e.message}\n`)
    return false
  } finally {
    starting = false
  }
}

// ── Main message handler ──────────────────────────────────────────

const rl = readline.createInterface({ input: process.stdin, terminal: false })

rl.on('line', async (line) => {
  let msg
  try { msg = JSON.parse(line) } catch { return }

  // initialize — respond immediately, no Chrome needed
  if (msg.method === 'initialize') {
    send({
      jsonrpc: '2.0',
      id: msg.id,
      result: {
        protocolVersion: '2025-03-26',
        capabilities: { tools: {} },
        serverInfo: { name: 'playwright-cdp-proxy', version: '1.0.0' },
      },
    })
    return
  }

  // initialized notification — swallow
  if (msg.method === 'notifications/initialized') return

  // tools/list — respond from hardcoded definitions, no Chrome needed
  if (msg.method === 'tools/list') {
    send({ jsonrpc: '2.0', id: msg.id, result: { tools: TOOLS } })
    return
  }

  // tools/call — this is where we need Chrome + Playwright MCP
  if (msg.method === 'tools/call') {
    // browser_launch — handled by proxy, not forwarded to child
    if (msg.params && msg.params.name === 'browser_launch') {
      const running = await checkPort(CDP_PORT)
      if (running) {
        send({ jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text: 'Chrome is already running.' }] } })
      } else {
        // Kill stale child if any
        if (child) { child.kill(); child = null; childReady = false }
        const ok = await ensureChild()
        if (ok) {
          send({ jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text: 'Chrome launched successfully.' }] } })
        } else {
          sendError(msg.id, -32000, 'Failed to launch Chrome')
        }
      }
      return
    }
    // download_file — handled by proxy, no browser needed
    if (msg.params && msg.params.name === 'download_file') {
      const { url, dest_path } = msg.params.arguments || {}
      if (!url || !dest_path) {
        sendError(msg.id, -32602, 'Missing required parameters: url and dest_path')
        return
      }
      try {
        await downloadFile(url, dest_path)
        const size = fs.statSync(dest_path).size
        send({ jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text: `Downloaded to ${dest_path} (${size} bytes)` }] } })
      } catch (e) {
        sendError(msg.id, -32000, `Download failed: ${e.message}`)
      }
      return
    }
    if (childReady && child) {
      child.stdin.write(line + '\n')
      return
    }
    if (starting) {
      pendingMessages.push(line)
      return
    }
    pendingMessages.push(line)
    const ok = await ensureChild()
    if (!ok) {
      for (const p of pendingMessages) {
        try {
          const pm = JSON.parse(p)
          if (pm.id != null) sendError(pm.id, -32000, 'Failed to launch Chrome')
        } catch {}
      }
      pendingMessages = []
    }
    return
  }

  // Everything else — forward if child is up
  if (childReady && child) {
    child.stdin.write(line + '\n')
  }
})

rl.on('close', () => {
  if (child) child.stdin.end()
  process.exit(0)
})

process.on('SIGINT', () => { if (child) child.kill('SIGINT'); process.exit(0) })
process.on('SIGTERM', () => { if (child) child.kill('SIGTERM'); process.exit(0) })
