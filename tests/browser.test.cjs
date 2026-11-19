const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup(search = '') {
  const elements = {};
  for (const id of ['screen', 'message', 'pause', 'render-status', 'theme', 'speed-value',
    'share-status', 'share-link', 'share-link-label', 'slower', 'faster', 'hearts',
    'zoom-in', 'zoom-out', 'zoom-fit', 'fullscreen', 'share']) {
    elements[`#${id}`] = {
      value: id === 'message' ? 'for you ♥' : '', textContent: '', innerHTML: '',
      selectedIndex: 0, clientWidth: 1000, style: {}, hidden: true, callbacks: {},
      addEventListener(type, callback) { this.callbacks[type] = callback; },
      setAttribute() {}, select() {},
      click() { return this.callbacks.click?.(); },
    };
  }
  let worker;
  const timers = [];
  class WorkerMock {
    constructor(url) { this.url = url; this.messages = []; worker = this; }
    postMessage(message) { this.messages.push(message); }
  }
  const document = {
    querySelector: selector => elements[selector],
    addEventListener() {},
    createElement: () => ({ getContext: () => ({ measureText: () => ({ width: 9.6 }) }) }),
  };
  const window = {
    location: { search, href: `https://example.com/Flower-Bouquet/${search}` },
    matchMedia: () => ({ matches: false }),
    addEventListener() {},
  };
  const sandbox = {
    document, window, Worker: WorkerMock, URL, URLSearchParams,
    navigator: { clipboard: { writeText: async () => {} } },
    performance: { now: () => 100 },
    setTimeout: callback => { timers.push(callback); return timers.length; },
  };
  const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  vm.runInNewContext(source, sandbox);
  return { elements, worker, timers };
}

test('share link preserves settings and escapes messages when displayed', async () => {
  const { elements, worker } = setup('?message=Hello%20%3Cfriend%3E&theme=Sunset&speed=1.2&hearts=24');
  assert.equal(elements['#message'].value, 'Hello <friend>');
  assert.equal(elements['#theme'].selectedIndex, 2);
  assert.equal(elements['#speed-value'].textContent, '1.2');
  worker.onmessage({ data: { type: 'frame', frame: '\x1b[38;5;196m<friend>&\x1b[0m' } });
  assert.match(elements['#screen'].innerHTML, /&lt;friend&gt;&amp;/);
  await elements['#share'].click();
  const url = new URL(elements['#share-link'].value);
  assert.equal(url.searchParams.get('message'), 'Hello <friend>');
  assert.equal(url.searchParams.get('theme'), 'Sunset');
  assert.equal(url.searchParams.get('speed'), '1.2');
  assert.equal(url.searchParams.get('hearts'), '24');
});

test('invalid share settings fall back to defaults', () => {
  const { elements } = setup('?theme=unknown&speed=999&hearts=-2');
  assert.equal(elements['#theme'].selectedIndex, 0);
  assert.equal(elements['#speed-value'].textContent, '0.6');
});

test('pausing stops frame requests after the final frame', () => {
  const { elements, worker, timers } = setup();
  worker.onmessage({ data: { type: 'ready' } });
  elements['#pause'].click();
  timers.shift()();
  assert.equal(worker.messages.at(-1).paused, true);
  worker.onmessage({ data: { type: 'frame', frame: 'paused' } });
  assert.equal(timers.length, 0);
  elements['#pause'].click();
  timers.shift()();
  assert.equal(worker.messages.at(-1).resetClock, true);
  assert.equal(worker.messages.at(-1).paused, false);
});
