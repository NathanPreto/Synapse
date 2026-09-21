// Carrega scripts "de navegador" (IIFEs que publicam em window.*) num contexto isolado do Node.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..', '..');

function createWindow(extra = {}) {
  const win = {
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Promise,
    Date,
    Math,
    JSON,
    URL,
    TextEncoder,
    TextDecoder,
    atob,
    btoa,
    crypto: globalThis.crypto,
    structuredClone,
    ...extra
  };
  win.window = win;
  win.globalThis = win;
  win.addEventListener = win.addEventListener || (() => {});
  win.removeEventListener = win.removeEventListener || (() => {});
  win.dispatchEvent = win.dispatchEvent || (() => true);
  win.CustomEvent =
    win.CustomEvent ||
    class CustomEvent {
      constructor(type, init) {
        this.type = type;
        this.detail = init && init.detail;
      }
    };
  return vm.createContext(win);
}

function load(win, relPath) {
  const code = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  vm.runInContext(code, win, { filename: relPath });
  return win;
}

/** In-memory localStorage-like store */
function memoryStorage() {
  const map = new Map();
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: k => void map.delete(k),
    key: i => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
    _map: map
  };
}

module.exports = { ROOT, createWindow, load, memoryStorage };
