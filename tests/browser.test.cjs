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
  const earthSource = fs.readFileSync(path.join(__dirname, '..', 'earth-mask.js'), 'utf8');
  vm.runInNewContext(earthSource, sandbox);
  vm.runInNewContext(scenesSource, sandbox);
  vm.runInNewContext(source, sandbox);
  return { elements, worker, timers, groups, scenes: window.AsciiScenes, land: window.EARTH_LAND_MASK };
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
  assert.equal(elements['#detail'].value, 'detailed');
});

test('classic detail remains available for existing shared links', () => {
  const { elements } = setup('?detail=classic');
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

test('all scenes produce distinct animated character grids', () => {
  const { scenes } = setup();
  const names = ['tree', 'snowglobe', 'aquarium', 'space', 'solar', 'ocean', 'rain', 'fireworks', 'nightsky'];
  const frames = names.map(scene => scenes.render(scene, { time: 2, message: 'Hello' }));
  assert.equal(new Set(frames).size, names.length);
  for (let i = 0; i < frames.length; i++) {
    assert.equal(frames[i].split('\n').length, scenes.dimensions(names[i]).height);
    assert.match(frames[i], /Hello/);
  }
  for (const scene of names) {
    assert.notEqual(scenes.render(scene, { time: 2 }), scenes.render(scene, { time: 3 }), scene);
  }
});

test('Earth rotates mapped land and the solar system identifies its planets', () => {
  const { scenes, land } = setup();
  const cell = (lat, lon) => land[Math.floor((90 - lat) / 2)][Math.floor((lon + 180) / 2)];
  assert.equal(cell(39, -99), '1'); // North America
  assert.equal(cell(23, 13), '1'); // Africa
  assert.equal(cell(-25, 133), '1'); // Australia
  assert.equal(cell(0, -145), '0'); // Pacific Ocean
  const earth = scenes.render('space', { time: 0 });
  assert.match(earth, /EARTH/);
  assert.match(earth, /%/);
  assert.notEqual(earth, scenes.render('space', { time: 8 }));
  const solar = scenes.render('solar', { time: 2 });
  for (const planet of ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune']) {
    assert.match(solar, new RegExp(planet));
  }
});

test('aquarium uses a larger grid with moving, detailed fish', () => {
  const { scenes } = setup();
  const frame = scenes.render('aquarium', { time: 3, waterColor: 'teal', fishColor: 'coral' });
  const plain = frame.replace(/\x1b\[[0-9;]*[mH]/g, '');
  const lines = plain.split('\n');
  assert.equal(lines.length, 52);
  assert.equal(lines[0].length, 164);
  assert.match(plain, /AQUARIUM/);
  assert.match(plain, /\(o\)|[()<>]o[()<>]/);
  assert.notEqual(frame, scenes.render('aquarium', { time: 4, waterColor: 'teal', fishColor: 'coral' }));
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

test('solar system can be opened and shared directly', async () => {
  const { elements } = setup('?scene=solar');
  assert.equal(elements['#scene'].value, 'solar');
  await elements['#share'].click();
  assert.equal(new URL(elements['#share-link'].value).searchParams.get('scene'), 'solar');
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

test('New York fireworks default to a rainbow over the skyline', () => {
  const { scenes } = setup();
  const frame = scenes.render('fireworks', { time: 3 });
  assert.match(frame, /NEW YORK CITY/);
  const colors = new Set([...frame.matchAll(/\x1b\[38;5;(\d+)m/g)].map(match => Number(match[1])));
  assert.ok([196, 208, 226, 46, 45, 141, 213].filter(color => colors.has(color)).length >= 4);
});

test('snow globe shake resumes a paused animation', () => {
  const { elements } = setup('?scene=snowglobe');
  elements['#pause'].click();
  assert.equal(elements['#pause'].textContent, 'RESUME');
  elements['#shake'].click();
  assert.equal(elements['#pause'].textContent, 'PAUSE');
});
