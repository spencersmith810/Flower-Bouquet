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
      value: '', textContent: '', innerHTML: '',
      selectedIndex: 0, clientWidth: 1000, style: {}, hidden: true, callbacks: {},
      addEventListener(type, callback) { this.callbacks[type] = callback; },
      setAttribute() {}, select() {},
      click() { return this.callbacks.click?.(); },
    };
  }
  elements['.terminal-title'] = { textContent: '' };
  const groups = ['bouquet', 'fireworks']
    .map(name => ({ dataset: { for: name }, hidden: false }));
  let worker;
  const timers = [];
  const clock = { now: 100 };
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
    performance: { now: () => clock.now },
    setTimeout: callback => { timers.push(callback); return timers.length; },
  };
  const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const scenesSource = fs.readFileSync(path.join(__dirname, '..', 'scenes.js'), 'utf8');
  const detailedSource = fs.readFileSync(path.join(__dirname, '..', 'detailed-scenes.js'), 'utf8');
  const earthSource = fs.readFileSync(path.join(__dirname, '..', 'earth-mask.js'), 'utf8');
  const terrainSource = fs.readFileSync(path.join(__dirname, '..', 'earth-terrain.js'), 'utf8');
  const nightSource = fs.readFileSync(path.join(__dirname, '..', 'earth-night-lights.js'), 'utf8');
  vm.runInNewContext(earthSource, sandbox);
  vm.runInNewContext(terrainSource, sandbox);
  vm.runInNewContext(nightSource, sandbox);
  vm.runInNewContext(detailedSource, sandbox);
  vm.runInNewContext(scenesSource, sandbox);
  vm.runInNewContext(source, sandbox);
  return { elements, worker, timers, clock, groups, window, scenes: window.AsciiScenes, detailed: window.DetailedScenes, land: window.EARTH_LAND_MASK };
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
  const names = ['earth-day-night', 'earth-realistic', 'earth-compare', 'solar', 'fireworks'];
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
  const { scenes, elements } = setup('?scene=earth-day-night&detail=classic');
  for (const scene of ['earth-day-night', 'earth-realistic', 'earth-compare', 'solar', 'fireworks']) {
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
  const earth = scenes.render('earth-day-night', { time: 0 });
  assert.match(earth, /EARTH/);
  assert.match(earth, /%/);
  assert.notEqual(earth, scenes.render('earth-day-night', { time: 8 }));
  const solar = scenes.render('solar', { time: 2 });
  for (const planet of ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune']) {
    assert.match(solar, new RegExp(planet));
  }
});

test('Earth is tilted and the Sun and Moon follow the shared animation clock', () => {
  const { detailed } = setup();
  const tilt = 23.4 * Math.PI / 180;
  const north = detailed.earthCoordinates(Math.sin(tilt), -Math.cos(tilt), 0, 0);
  assert.ok(Math.abs(north.latitude - Math.PI / 2) < 1e-7);
  const start = detailed.earthSky(0), later = detailed.earthSky(10);
  assert.notEqual(start.sunX, later.sunX);
  assert.notEqual(start.moonX, later.moonX);
  assert.notEqual(detailed.earthSunlight(-.7, .7, 0, 0), detailed.earthSunlight(-.7, .7, 0, 10));

  const { elements, timers, clock, scenes } = setup('?scene=earth-day-night');
  const times = [];
  scenes.render = (scene, options) => { times.push(options.time); return ''; };
  timers.shift()();
  clock.now += 100;
  timers.shift()();
  assert.ok(Math.abs(times.at(-1) - .1) < 1e-9);
  elements['#faster'].click();
  clock.now += 100;
  timers.shift()();
  assert.ok(Math.abs(times.at(-1) - (.1 + .1 * .7 / .6)) < 1e-9);
  elements['#pause'].click();
  clock.now += 100;
  timers.shift()();
  assert.equal(times.at(-1), times.at(-2));
});

test('realistic Earth preserves day, year, and lunar timing', () => {
  const { detailed } = setup();
  const first = detailed.realisticEarthSystem(0);
  const afterDay = detailed.realisticEarthSystem(42);
  const afterYear = detailed.realisticEarthSystem(42 * 365.2422);
  const afterMoonOrbit = detailed.realisticEarthSystem(42 * 27.32166);
  assert.equal(afterDay.days, 1);
  assert.ok(Math.abs(afterYear.yearAngle - 2 * Math.PI) < 1e-9);
  assert.ok(Math.abs(afterMoonOrbit.moonAngle + afterMoonOrbit.yearAngle - 2 * Math.PI) < 1e-9);
  assert.ok(Math.abs(first.illuminated) < 1e-9);
  const halfSynodicMonth = 1 / (1 / 27.32166 - 1 / 365.2422) / 2;
  assert.ok(detailed.realisticEarthSystem(42 * halfSynodicMonth).illuminated > .999);
  const equinox = detailed.realisticEarthCoordinates(0, 0, 1, first);
  const oneDayLater = detailed.realisticEarthCoordinates(0, 0, 1, afterDay);
  assert.ok(Math.abs(Math.sin(equinox.longitude - oneDayLater.longitude)) < .003);
});

test('satellite follows a prograde orbit and passes behind Earth', () => {
  const { detailed } = setup();
  const period = 42 * 92 / 1440;
  const first = detailed.satelliteOrbit(0, true);
  const half = detailed.satelliteOrbit(period / 2, true);
  const complete = detailed.satelliteOrbit(period, true);
  assert.ok(Math.abs(complete.angle - first.angle + 2 * Math.PI) < 1e-9);
  assert.ok(first.z * half.z < 0);
  assert.ok(Math.abs(Math.hypot(first.x, first.y, first.z) - 1.12) < 1e-9);
  function longitude(time) {
    const satellite = detailed.satelliteOrbit(time, true);
    return detailed.realisticEarthCoordinates(satellite.x / 1.12, satellite.y / 1.12,
      satellite.z / 1.12, detailed.realisticEarthSystem(time)).longitude;
  }
  assert.ok(longitude(.01) > longitude(0)); // Eastward relative to Earth's surface
  assert.notEqual(detailed.satelliteOrbit(0, false).x, detailed.satelliteOrbit(.1, false).x);
});

test('Earth comparison and realistic view can be shared', async () => {
  for (const scene of ['earth-compare', 'earth-realistic']) {
    const { elements, scenes } = setup(`?scene=${scene}`);
    assert.equal(elements['#scene'].value, scene);
    const frame = scenes.render(scene, { time: 10, detail: 'detailed', message: 'Hello' });
    assert.match(frame, scene === 'earth-compare' ? /ORIGINAL EARTH/ : /REALISTIC TIMING/);
    if (scene === 'earth-compare') assert.match(frame, /REALISTIC EARTH/);
    assert.match(frame, /Hello/);
    await elements['#share'].click();
    assert.equal(new URL(elements['#share-link'].value).searchParams.get('scene'), scene);
  }
});

test('polar land is icy white while polar oceans stay blue', () => {
  const { scenes, window } = setup();
  window.EARTH_NIGHT_LIGHTS = Array.from({ length: 360 }, () => '0'.repeat(720));
  function cellColor(frame, targetX, targetY) {
    let x = 0, y = 0, color = -1;
    for (const token of frame.match(/\x1b\[[0-9;]*[mH]|[^\x1b]/g)) {
      const match = token.match(/^\x1b\[38;5;(\d+)m$/);
      if (match) color = Number(match[1]);
      else if (token === '\n') { x = 0; y++; }
      else if (!token.startsWith('\x1b')) {
        if (x === targetX && y === targetY) return color;
        x++;
      }
    }
    throw new Error('Polar cell not found');
  }
  for (const detail of ['classic', 'detailed']) for (const scene of ['earth-day-night']) {
    window.EARTH_LAND_MASK = Array.from({ length: 90 }, () => '1'.repeat(180));
    const land = scenes.render(scene, { detail, time: 0 });
    window.EARTH_LAND_MASK = Array.from({ length: 90 }, () => '0'.repeat(180));
    const ocean = scenes.render(scene, { detail, time: 0 });
    for (const [x, y] of [[174, 14], [126, 72]]) {
      assert.ok([250, 255].includes(cellColor(land, x, y)), `${scene} ${detail} land at ${x},${y}`);
      assert.ok([24, 75, 67].includes(cellColor(ocean, x, y)), `${scene} ${detail} ocean at ${x},${y}`);
    }
  }
});

test('Earth uses geographic terrain colors in both detail modes', () => {
  const { scenes, detailed, window } = setup();
  const radians = degrees => degrees * Math.PI / 180;
  assert.equal(detailed.earthTerrainColor(radians(24), radians(13)), 180); // Sahara sand
  assert.equal(detailed.earthTerrainColor(radians(0), radians(23)), 34); // Congo forest
  assert.equal(detailed.earthTerrainColor(radians(-25), radians(134)), 173); // Australian interior
  assert.equal(detailed.earthTerrainColor(radians(73), radians(-40)), 255); // Greenland ice
  for (const detail of ['classic', 'detailed']) for (const scene of ['earth-day-night']) {
    window.EARTH_TERRAIN = Array.from({ length: 180 }, () => 'S'.repeat(360));
    const sandy = scenes.render(scene, { time: 0, detail });
    window.EARTH_TERRAIN = Array.from({ length: 180 }, () => 'F'.repeat(360));
    const forest = scenes.render(scene, { time: 0, detail });
    assert.match(sandy, /\x1b\[38;5;180m/);
    assert.match(forest, /\x1b\[38;5;34m/);
    assert.notEqual(sandy, forest);
  }
});

test('previous Earth links open the realistic Earth scene', () => {
  for (const scene of ['space', 'earth-night', 'earth-day-night']) {
    assert.equal(setup(`?scene=${scene}`).elements['#scene'].value, 'earth-realistic');
  }
});

test('default message is empty and custom messages remain available', () => {
  assert.equal(setup().elements['#message'].value, '');
  assert.equal(setup('?message=Hello').elements['#message'].value, 'Hello');
});

test('day-night Earth shows lights only on the shadow side and can be shared', async () => {
  const { scenes, elements, window } = setup('?scene=earth-realistic');
  assert.equal(elements['#scene'].value, 'earth-realistic');
  window.EARTH_NIGHT_LIGHTS = Array.from({ length: 360 }, () => '9'.repeat(720));
  function colorAt(frame, targetX, targetY) {
    let x = 0, y = 0, color = -1;
    const tokens = frame.match(/\x1b\[[0-9;]*[mH]|[^\x1b]/g);
    for (const token of tokens) {
      const match = token.match(/^\x1b\[38;5;(\d+)m$/);
      if (match) color = Number(match[1]);
      else if (token === '\n') { x = 0; y++; }
      else if (!token.startsWith('\x1b')) {
        if (x === targetX && y === targetY) return color;
        x++;
      }
    }
    throw new Error('Cell not found');
  }
  for (const detail of ['classic', 'detailed']) {
    const frame = scenes.render('earth-day-night', { time: 0, detail });
    assert.match(frame, /EARTH \/ DAY AND NIGHT/);
    assert.equal(colorAt(frame, 100, 43), 230);
    assert.notEqual(colorAt(frame, 180, 43), 230);
    // At the same horizontal position the curved edge is in shadow near the top,
    // but illuminated closer to the middle of the globe.
    assert.equal(colorAt(frame, 114, 16), 230);
    assert.notEqual(colorAt(frame, 114, 43), 230);
    assert.notEqual(frame, scenes.render('earth-day-night', { time: 8, detail }));
  }
  await elements['#share'].click();
  assert.equal(new URL(elements['#share-link'].value).searchParams.get('scene'), 'earth-realistic');
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

test('aquarium plays wide, shark, pufferfish and wide shots in both detail modes', () => {
  const { scenes } = setup();
  for (const detail of ['classic', 'detailed']) {
    const render = time => scenes.render('aquarium', { time, detail, message: 'Hello', waterColor: 'teal', fishColor: 'coral' });
    const wide = render(2), shark = render(12), puffer = render(21), returnToWide = render(29);
    assert.match(wide, /AQUARIUM/);
    assert.match(shark, /AQUARIUM \/ SHARK/);
    assert.match(puffer, /AQUARIUM \/ PUFFERFISH/);
    assert.match(returnToWide, /AQUARIUM/);
    assert.doesNotMatch(returnToWide, /SHARK|PUFFERFISH/);
    for (const frame of [wide, render(8.5), shark, render(17.5), puffer, render(26.5), returnToWide]) {
      const lines = frame.replace(/\x1b\[[0-9;]*[mH]/g, '').split('\n');
      assert.equal(lines.length, 90);
      assert.ok(lines.every(line => [...line].length === 300));
      assert.match(frame, /Hello/);
    }
    assert.notEqual(shark, render(13));
    assert.notEqual(puffer, render(22));
  }
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
  const { elements, groups } = setup('?scene=fireworks&fireworks=warm');
  assert.equal(elements['#scene'].value, 'fireworks');
  assert.equal(groups.find(group => group.dataset.for === 'fireworks').hidden, false);
  assert.equal(groups.find(group => group.dataset.for === 'bouquet').hidden, true);
  await elements['#share'].click();
  const url = new URL(elements['#share-link'].value);
  assert.equal(url.searchParams.get('scene'), 'fireworks');
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
  for (const scene of ['aquarium', 'tree', 'snowglobe', 'ocean', 'rain', 'nightsky']) {
    assert.equal(setup(`?scene=${scene}`).elements['#scene'].value, 'bouquet');
  }
});
