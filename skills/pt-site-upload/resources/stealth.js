// Init script — runs before every page load via @playwright/mcp --init-script

// 1. Suppress beforeunload dialogs — intercept so handlers never register.
//    Without this, "leave page?" dialogs block automation silently.
const _origAddEventListener = EventTarget.prototype.addEventListener;
EventTarget.prototype.addEventListener = function (type, listener, options) {
  if (type === 'beforeunload') return;
  return _origAddEventListener.call(this, type, listener, options);
};
Object.defineProperty(window, 'onbeforeunload', { get: () => null, set: () => {}, configurable: true });

// 2. Override navigator.languages — Portuguese locale for PT marketplaces
Object.defineProperty(navigator, 'languages', {
  get: () => ['pt-PT', 'pt', 'en-US', 'en'],
  configurable: true,
});
