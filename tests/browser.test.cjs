const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup(search = '') {
  const elements = {};
  for (const id of ['screen', 'message', 'pause', 'render-status', 'theme', 'flowers', 'detail', 'speed-value',
    'scene', 'season', 'water-color', 'fish-color', 'ocean-time', 'firework-color', 'shake',
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
  elements['.terminal-title'] = { textContent: '' };
  const groups = ['bouquet', 'tree', 'snowglobe', 'aquarium', 'ocean', 'fireworks']
    .map(name => ({ dataset: { for: name }, hidden: false }));
  let worker;
  const timers = [];
  class WorkerMock {
    constructor(url) { this.url = url; this.messages = []; worker = this; }
    postMessage(message) { this.messages.push(message); }
  }
  const document = {
    querySelector: selector => elements[selector],
    querySelectorAll: () => groups,
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
  const scenesSource = fs.readFileSync(path.join(__dirname, '..', 'scenes.js'), 'utf8');
  vm.runInNewContext(scenesSource, sandbox);
  vm.runInNewContext(source, sandbox);
  return { elements, worker, timers, groups, scenes: window.AsciiScenes };
}

test('share link preserves settings and escapes messages when displayed', async () => {
  const { elements, worker } = setup('?message=Hello%20%3Cfriend%3E&theme=Sunset&speed=1.2&hearts=24&flowers=roses&detail=detailed');
  assert.equal(elements['#message'].value, 'Hello <friend>');
  assert.equal(elements['#theme'].selectedIndex, 2);
  assert.equal(elements['#speed-value'].textContent, '1.2');
  assert.equal(elements['#flowers'].value, 'roses');
  assert.equal(elements['#detail'].value, 'detailed');
  worker.onmessage({ data: { type: 'frame', frame: '\x1b[38;5;196m<friend>&\x1b[0m' } });
  assert.match(elements['#screen'].innerHTML, /&lt;friend&gt;&amp;/);
  await elements['#share'].click();
  const url = new URL(elements['#share-link'].value);
  assert.equal(url.searchParams.get('message'), 'Hello <friend>');
  assert.equal(url.searchParams.get('theme'), 'Sunset');
  assert.equal(url.searchParams.get('speed'), '1.2');
  assert.equal(url.searchParams.get('hearts'), '24');
  assert.equal(url.searchParams.get('flowers'), 'roses');
  assert.equal(url.searchParams.get('detail'), 'detailed');
});

test('invalid share settings fall back to defaults', () => {
  const { elements } = setup('?theme=unknown&speed=999&hearts=-2&flowers=invalid&detail=invalid');
  assert.equal(elements['#theme'].selectedIndex, 0);
  assert.equal(elements['#speed-value'].textContent, '0.6');
  assert.equal(elements['#flowers'].value, 'original');
  assert.equal(elements['#detail'].value, 'classic');
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

test('choosing a flower style and detail level reaches the renderer', () => {
  const { elements, worker, timers } = setup();
  worker.onmessage({ data: { type: 'ready' } });
  elements['#flowers'].value = 'sunflowers';
  elements['#flowers'].callbacks.change();
  elements['#detail'].value = 'detailed';
  elements['#detail'].callbacks.change();
  timers.shift()();
  assert.equal(worker.messages.at(-1).flowerStyle, 'sunflowers');
  assert.equal(worker.messages.at(-1).detail, 'detailed');
});

test('all eight scenes produce distinct animated character grids', () => {
  const { scenes } = setup();
  const names = ['tree', 'snowglobe', 'aquarium', 'space', 'ocean', 'rain', 'fireworks', 'nightsky'];
  const frames = names.map(scene => scenes.render(scene, { time: 2, message: 'Hello' }));
  assert.equal(new Set(frames).size, names.length);
  for (const frame of frames) {
    assert.equal(frame.split('\n').length, 38);
    assert.match(frame, /Hello/);
  }
  for (const scene of names) {
    assert.notEqual(scenes.render(scene, { time: 2 }), scenes.render(scene, { time: 3 }), scene);
  }
});

test('scene choice and options round-trip through sharing', async () => {
  const { elements, groups } = setup('?scene=tree&season=winter&fish=cool&fireworks=warm');
  assert.equal(elements['#scene'].value, 'tree');
  assert.equal(elements['#season'].value, 'winter');
  assert.equal(groups.find(group => group.dataset.for === 'tree').hidden, false);
  assert.equal(groups.find(group => group.dataset.for === 'bouquet').hidden, true);
  await elements['#share'].click();
  const url = new URL(elements['#share-link'].value);
  assert.equal(url.searchParams.get('scene'), 'tree');
  assert.equal(url.searchParams.get('season'), 'winter');
  assert.equal(url.searchParams.get('fish'), 'cool');
  assert.equal(url.searchParams.get('fireworks'), 'warm');
});

test('scene controls change the generated artwork', () => {
  const { scenes } = setup();
  assert.notEqual(scenes.render('tree', { time: 2, season: 'spring' }),
                  scenes.render('tree', { time: 2, season: 'winter' }));
  assert.notEqual(scenes.render('snowglobe', { time: 2, shakeTime: 1 }),
                  scenes.render('snowglobe', { time: 2 }));
  assert.notEqual(scenes.render('aquarium', { time: 2, waterColor: 'teal', fishColor: 'coral' }),
                  scenes.render('aquarium', { time: 2, waterColor: 'purple', fishColor: 'cool' }));
  assert.notEqual(scenes.render('ocean', { time: 2, oceanTime: 'sunset' }),
                  scenes.render('ocean', { time: 2, oceanTime: 'night' }));
  assert.notEqual(scenes.render('fireworks', { time: 2, fireworkColor: 'warm' }),
                  scenes.render('fireworks', { time: 2, fireworkColor: 'cool' }));
});

test('snow globe shake resumes a paused animation', () => {
  const { elements } = setup('?scene=snowglobe');
  elements['#pause'].click();
  assert.equal(elements['#pause'].textContent, 'RESUME');
  elements['#shake'].click();
  assert.equal(elements['#pause'].textContent, 'PAUSE');
});
