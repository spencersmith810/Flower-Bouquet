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
  const groups = ['bouquet', 'aquarium', 'fireworks']
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
  const detailedSource = fs.readFileSync(path.join(__dirname, '..', 'detailed-scenes.js'), 'utf8');
  const earthSource = fs.readFileSync(path.join(__dirname, '..', 'earth-mask.js'), 'utf8');
  const nightSource = fs.readFileSync(path.join(__dirname, '..', 'earth-night-lights.js'), 'utf8');
  vm.runInNewContext(earthSource, sandbox);
  vm.runInNewContext(nightSource, sandbox);
  vm.runInNewContext(detailedSource, sandbox);
  vm.runInNewContext(scenesSource, sandbox);
  vm.runInNewContext(source, sandbox);
  return { elements, worker, timers, groups, scenes: window.AsciiScenes, detailed: window.DetailedScenes, land: window.EARTH_LAND_MASK };
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
  const names = ['aquarium', 'space', 'earth-night', 'solar', 'fireworks'];
  const frames = names.map(scene => scenes.render(scene, { time: 2, message: 'Hello' }));
  assert.equal(new Set(frames).size, names.length);
  for (let i = 0; i < frames.length; i++) {
    assert.deepEqual({ ...scenes.dimensions(names[i]) }, { width: 300, height: 90 });
    const lines = frames[i].replace(/\x1b\[[0-9;]*[mH]/g, '').split('\n');
    assert.equal(lines.length, 90, names[i]);
    for (const line of lines) assert.equal([...line].length, 300, names[i]);
    assert.match(frames[i], /Hello/);
  }
  for (const scene of names) {
    assert.notEqual(scenes.render(scene, { time: 2 }), scenes.render(scene, { time: 3 }), scene);
  }
});

test('every scene offers a distinct classic and fine-detail rendering', async () => {
  const { scenes, elements } = setup('?scene=aquarium&detail=classic');
  for (const scene of ['aquarium', 'space', 'earth-night', 'solar', 'fireworks']) {
    const classic = scenes.render(scene, { time: 2, detail: 'classic' });
    const detailed = scenes.render(scene, { time: 2, detail: 'detailed' });
    assert.notEqual(classic, detailed, scene);
    for (const frame of [classic, detailed]) {
      const lines = frame.replace(/\x1b\[[0-9;]*[mH]/g, '').split('\n');
      assert.equal(lines.length, 90, scene);
      assert.ok(lines.every(line => [...line].length === 300), scene);
    }
  }
  elements['#detail'].value = 'detailed';
  elements['#detail'].callbacks.change();
  await elements['#share'].click();
  assert.equal(new URL(elements['#share-link'].value).searchParams.get('detail'), 'detailed');
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

test('Earth at night renders satellite lights and supports shared links', async () => {
  const { scenes, elements } = setup('?scene=earth-night');
  assert.equal(elements['#scene'].value, 'earth-night');
  for (const detail of ['classic', 'detailed']) {
    const frame = scenes.render('earth-night', { time: 0, detail });
    assert.match(frame, /EARTH AT NIGHT/);
    assert.match(frame, /\x1b\[38;5;(178|230)m/);
    assert.notEqual(frame, scenes.render('earth-night', { time: 8, detail }));
  }
  await elements['#share'].click();
  assert.equal(new URL(elements['#share-link'].value).searchParams.get('scene'), 'earth-night');
});

test('aquarium uses a larger grid with moving, detailed fish', () => {
  const { scenes } = setup();
  const frame = scenes.render('aquarium', { time: 3, waterColor: 'teal', fishColor: 'coral' });
  const plain = frame.replace(/\x1b\[[0-9;]*[mH]/g, '');
  const lines = plain.split('\n');
  assert.equal(lines.length, 90);
  assert.equal(lines[0].length, 300);
  assert.match(plain, /AQUARIUM/);
  assert.match(plain, /o\s+\)>/);
  assert.notEqual(frame, scenes.render('aquarium', { time: 4, waterColor: 'teal', fishColor: 'coral' }));
});

test('shark and pufferfish are visible in both aquarium detail modes', () => {
  const { scenes } = setup();
  for (const detail of ['classic', 'detailed']) {
    const frame = scenes.render('aquarium', { time: 0, detail }).replace(/\x1b\[[0-9;]*[mH]/g, '');
    assert.match(frame, /\^\^/); // Pufferfish spines
    assert.match(frame, /\){3}/); // Shark gills
  }
});

test('aquarium fish stay in separate lanes and wrap outside the tank', () => {
  const { detailed } = setup();
  for (const config of [
    { left: 0, right: 300, classic: false, fishWidth: 29, sharkWidth: 40, pufferWidth: 20 },
    { left: 4, right: 159, classic: true, fishWidth: 20, sharkWidth: 32, pufferWidth: 16 },
  ]) {
    for (let time = 0; time < 300; time += .25) {
      const fish = detailed.aquariumLayout({ ...config, time });
      for (let i = 0; i < fish.length; i++) for (let j = i + 1; j < fish.length; j++) {
        const a = fish[i], b = fish[j];
        const visibleA = a.x < config.right && a.x + a.width > config.left;
        const visibleB = b.x < config.right && b.x + b.width > config.left;
        if (!visibleA || !visibleB) continue;
        const overlaps = a.x < b.x + b.width && b.x < a.x + a.width &&
          a.y < b.y + b.height && b.y < a.y + a.height;
        assert.equal(overlaps, false, `${a.kind} and ${b.kind} overlap at ${time}`);
      }
    }
    const wrapAt = (config.right - config.left - 25) / 2.4;
    const before = detailed.aquariumLayout({ ...config, time: wrapAt - .01 })[0];
    const after = detailed.aquariumLayout({ ...config, time: wrapAt + .01 })[0];
    assert.ok(before.x >= config.right - 1);
    assert.ok(after.x + after.width <= config.left + 1);
  }
  assert.notDeepEqual(detailed.animateFishTail(['<  >'], 0), detailed.animateFishTail(['<  >'], .2));
});

test('scene choice and options round-trip through sharing', async () => {
  const { elements, groups } = setup('?scene=aquarium&water=teal&fish=cool&fireworks=warm');
  assert.equal(elements['#scene'].value, 'aquarium');
  assert.equal(elements['#water-color'].value, 'teal');
  assert.equal(groups.find(group => group.dataset.for === 'aquarium').hidden, false);
  assert.equal(groups.find(group => group.dataset.for === 'bouquet').hidden, true);
  await elements['#share'].click();
  const url = new URL(elements['#share-link'].value);
  assert.equal(url.searchParams.get('scene'), 'aquarium');
  assert.equal(url.searchParams.get('water'), 'teal');
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
  assert.notEqual(scenes.render('aquarium', { time: 2, waterColor: 'teal', fishColor: 'coral' }),
                  scenes.render('aquarium', { time: 2, waterColor: 'purple', fishColor: 'cool' }));
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

test('links to removed scenes fall back to the bouquet', () => {
  for (const scene of ['tree', 'snowglobe', 'ocean', 'rain', 'nightsky']) {
    assert.equal(setup(`?scene=${scene}`).elements['#scene'].value, 'bouquet');
  }
});
