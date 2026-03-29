// Stealth patches — runs before every page load via @playwright/mcp --init-script

// 1. Remove webdriver flag
Object.defineProperty(navigator, 'webdriver', {
  get: () => false,
  configurable: true,
});

// 2. Override navigator.plugins to look non-empty
Object.defineProperty(navigator, 'plugins', {
  get: () => {
    const arr = [
      { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
      { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
    ];
    arr.item = (i) => arr[i] || null;
    arr.namedItem = (name) => arr.find(p => p.name === name) || null;
    arr.refresh = () => {};
    return arr;
  },
  configurable: true,
});

// 3. Override navigator.languages — Portuguese locale for PT marketplaces
Object.defineProperty(navigator, 'languages', {
  get: () => ['pt-PT', 'pt', 'en-US', 'en'],
  configurable: true,
});

// 4. Patch chrome.runtime to exist (signals a real Chrome browser)
if (!window.chrome) window.chrome = {};
if (!window.chrome.runtime) window.chrome.runtime = { id: undefined };

// 5. Remove automation-related properties from window
try { delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array; } catch {}
try { delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise; } catch {}
try { delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol; } catch {}

// 6. Override permissions query to report correct state for notifications
const originalQuery = window.navigator.permissions?.query;
if (originalQuery) {
  window.navigator.permissions.query = (parameters) =>
    parameters.name === 'notifications'
      ? Promise.resolve({ state: Notification.permission })
      : originalQuery(parameters);
}
