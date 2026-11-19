import { loadPyodide } from 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.mjs';

let pyodide;
let renderer;

async function initialize() {
  self.postMessage({ type: 'loading', message: 'Loading the Python runtime…' });
  pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/' });
  self.postMessage({ type: 'loading', message: 'Preparing the bouquet…' });
  const names = ['bouquet3d.py', 'browser_renderer.py'];
  const version = new URL(self.location.href).search;
  const responses = await Promise.all(names.map(name => fetch(new URL(name + version, self.location.href))));
  for (let i = 0; i < names.length; i += 1) {
    if (!responses[i].ok) throw new Error(`Could not load ${names[i]}`);
    pyodide.FS.writeFile(names[i], await responses[i].text());
  }
  pyodide.runPython('from browser_renderer import BrowserBouquet\nrenderer = BrowserBouquet()');
  renderer = pyodide.globals.get('renderer');
  self.postMessage({ type: 'ready' });
}

self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'init') {
      await initialize();
    } else if (data.type === 'frame' && renderer) {
      const frame = renderer.frame(data.timestamp, data.paused, data.speed, data.theme,
                                   data.heartCount, data.message, data.resetClock,
                                   data.flowerStyle, data.detail);
      self.postMessage({ type: 'frame', frame });
    }
  } catch (error) {
    self.postMessage({ type: 'error', message: String(error.message || error) });
  }
};
