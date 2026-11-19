const screen = document.querySelector('#screen');
const messageInput = document.querySelector('#message');
const pauseButton = document.querySelector('#pause');
const status = document.querySelector('#render-status');
const themeSelect = document.querySelector('#theme');
const sceneSelect = document.querySelector('#scene');
const seasonSelect = document.querySelector('#season');
const waterSelect = document.querySelector('#water-color');
const fishSelect = document.querySelector('#fish-color');
const oceanSelect = document.querySelector('#ocean-time');
const fireworkSelect = document.querySelector('#firework-color');
const flowerSelect = document.querySelector('#flowers');
const detailSelect = document.querySelector('#detail');
const terminalTitle = document.querySelector('.terminal-title');
const speedValue = document.querySelector('#speed-value');
const shareStatus = document.querySelector('#share-status');
const shareLink = document.querySelector('#share-link');
const shareLabel = document.querySelector('#share-link-label');
const worker = new Worker('renderer-worker.js?v=20261119e', { type: 'module' });
const themeNames = ['Original', 'Romantic', 'Sunset', 'Lavender Garden', 'Spring', 'Midnight', 'Monochrome'];
const flowerStyles = ['original', 'roses', 'sunflowers', 'mixed'];
const detailLevels = ['classic', 'detailed'];
const sceneNames = { bouquet: 'Flower bouquet', tree: 'Seasonal tree', snowglobe: 'Snow globe',
  aquarium: 'Aquarium', space: 'Space', ocean: 'Ocean', rain: 'Rainy window',
  fireworks: 'Fireworks', nightsky: 'Night sky' };
const params = new URLSearchParams(window.location.search);
function option(key, choices, fallback) {
  const value = params.get(key);
  return choices.includes(value) ? value : fallback;
}
function boundedNumber(value, fallback, min, max) {
  if (value === null || value.trim() === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : fallback;
}
const selectedTheme = themeNames.indexOf(params.get('theme'));
const state = {
  paused: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  speed: boundedNumber(params.get('speed'), 0.6, 0.1, 3),
  theme: Math.max(0, selectedTheme),
  heartCount: Math.round(boundedNumber(params.get('hearts'), 18, 0, 100)),
  flowerStyle: flowerStyles.includes(params.get('flowers')) ? params.get('flowers') : 'original',
  detail: detailLevels.includes(params.get('detail')) ? params.get('detail') : 'classic',
  scene: option('scene', Object.keys(sceneNames), 'bouquet'),
  season: option('season', ['spring', 'summer', 'autumn', 'winter'], 'spring'),
  waterColor: option('water', ['blue', 'teal', 'purple'], 'blue'),
  fishColor: option('fish', ['mixed', 'coral', 'cool'], 'mixed'),
  oceanTime: option('sky', ['sunset', 'night'], 'sunset'),
  fireworkColor: option('fireworks', ['rainbow', 'warm', 'cool'], 'rainbow'),
};
if (params.has('message')) messageInput.value = params.get('message').slice(0, 42);
themeSelect.selectedIndex = state.theme;
flowerSelect.value = state.flowerStyle;
detailSelect.value = state.detail;
sceneSelect.value = state.scene;
seasonSelect.value = state.season;
waterSelect.value = state.waterColor;
fishSelect.value = state.fishColor;
oceanSelect.value = state.oceanTime;
fireworkSelect.value = state.fireworkColor;
speedValue.textContent = state.speed.toFixed(1);
pauseButton.textContent = state.paused ? 'RESUME' : 'PAUSE';
pauseButton.setAttribute('aria-pressed', String(state.paused));
let ready = false;
let workerError = '';
let inFlight = false;
let needsFrame = true;
let resetClock = false;
let timer = null;
let frameStarted = 0;
let sceneTime = 0;
let lastSceneTimestamp = null;
let shakeTime = -100;

// Python emits ANSI 256-color codes; translate them into browser colors.
function terminalColor(code) {
  const base = ['#000000', '#800000', '#008000', '#808000', '#000080', '#800080', '#008080', '#c0c0c0',
    '#808080', '#ff0000', '#00ff00', '#ffff00', '#0000ff', '#ff00ff', '#00ffff', '#ffffff'];
  if (code < 16) return base[code];
  if (code >= 232) {
    const gray = 8 + (code - 232) * 10;
    return `rgb(${gray},${gray},${gray})`;
  }
  const value = code - 16;
  const levels = [0, 95, 135, 175, 215, 255];
  return `rgb(${levels[Math.floor(value / 36)]},${levels[Math.floor(value / 6) % 6]},${levels[value % 6]})`;
}

function escapeText(text) {
  return text.replace(/[&<>]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char]);
}

function displayFrame(frame) {
  const ansi = /\x1b\[(?:38;5;(\d+)m|0m|H)/g;
  let html = '';
  let last = 0;
  let color = '';
  for (const match of frame.matchAll(ansi)) {
    const chunk = escapeText(frame.slice(last, match.index));
    html += color ? `<span style="color:${color}">${chunk}</span>` : chunk;
    if (match[1] !== undefined) color = terminalColor(Number(match[1]));
    else if (match[0] === '\x1b[0m') color = '';
    last = match.index + match[0].length;
  }
  screen.innerHTML = html + escapeText(frame.slice(last));
}

function scheduleFrame(delay = 0) {
  if ((state.scene === 'bouquet' && !ready) || inFlight || timer !== null || (state.paused && !needsFrame)) return;
  timer = setTimeout(() => {
    timer = null;
    if ((state.scene === 'bouquet' && !ready) || inFlight || (state.paused && !needsFrame)) return;
    inFlight = true;
    needsFrame = false;
    frameStarted = performance.now();
    if (state.scene === 'bouquet') {
      worker.postMessage({ type: 'frame', timestamp: frameStarted, ...state,
        message: messageInput.value, resetClock });
      resetClock = false;
    } else {
      if (lastSceneTimestamp === null) lastSceneTimestamp = frameStarted;
      const dt = Math.min(Math.max((frameStarted - lastSceneTimestamp) / 1000, 0), .1);
      lastSceneTimestamp = frameStarted;
      if (!state.paused) sceneTime += dt * state.speed / 0.6;
      displayFrame(window.AsciiScenes.render(state.scene, { ...state, time: sceneTime,
        message: messageInput.value, shakeTime }));
      inFlight = false;
      scheduleFrame(state.paused ? 0 : Math.max(0, 1000 / 24 - (performance.now() - frameStarted)));
    }
  }, delay);
}

function redraw() {
  needsFrame = true;
  scheduleFrame();
}

worker.onmessage = ({ data }) => {
  if (data.type === 'loading') {
    if (state.scene === 'bouquet') status.textContent = data.message;
  } else if (data.type === 'ready') {
    ready = true;
    status.textContent = '';
    scheduleFrame();
  } else if (data.type === 'frame') {
    if (state.scene === 'bouquet') displayFrame(data.frame);
    inFlight = false;
    scheduleFrame(state.paused ? 0 : Math.max(0, 1000 / 24 - (performance.now() - frameStarted)));
  } else if (data.type === 'error') {
    ready = false;
    inFlight = false;
    workerError = `Unable to start the bouquet: ${data.message}. Refresh to try again.`;
    if (state.scene === 'bouquet') status.textContent = workerError;
    else redraw();
  }
};
worker.onerror = () => {
  ready = false;
  inFlight = false;
  workerError = 'Unable to load the Python renderer. Check your connection and refresh.';
  if (state.scene === 'bouquet') status.textContent = workerError;
  else redraw();
};
worker.postMessage({ type: 'init' });
if (state.scene !== 'bouquet') { status.textContent = ''; scheduleFrame(); }

function changeTheme(direction) {
  state.theme = (state.theme + direction + themeNames.length) % themeNames.length;
  themeSelect.selectedIndex = state.theme;
  redraw();
}
pauseButton.addEventListener('click', () => {
  state.paused = !state.paused;
  resetClock = true;
  lastSceneTimestamp = null;
  pauseButton.textContent = state.paused ? 'RESUME' : 'PAUSE';
  pauseButton.setAttribute('aria-pressed', String(state.paused));
  redraw();
});
function changeSpeed(delta) {
  state.speed = Math.round(Math.min(3, Math.max(0.1, state.speed + delta)) * 10) / 10;
  speedValue.textContent = state.speed.toFixed(1);
  redraw();
}
document.querySelector('#slower').addEventListener('click', () => changeSpeed(-0.1));
document.querySelector('#faster').addEventListener('click', () => changeSpeed(0.1));
document.querySelector('#hearts').addEventListener('click', () => { state.heartCount = Math.min(100, state.heartCount + 3); redraw(); });
themeSelect.addEventListener('change', () => { state.theme = themeSelect.selectedIndex; redraw(); });
function syncSceneControls() {
  document.querySelectorAll('.option-group').forEach(group => { group.hidden = group.dataset.for !== state.scene; });
  screen.setAttribute('aria-label', `Animated ${sceneNames[state.scene]} ASCII scene; scroll to view when zoomed`);
  terminalTitle.textContent = state.scene === 'bouquet'
    ? `Flower Bouquet — Python bouquet3d.py — ${state.detail === 'detailed' ? '301×76' : '213×54'}`
    : `${sceneNames[state.scene]} — ASCII scene`;
}
sceneSelect.addEventListener('change', () => {
  state.scene = sceneSelect.value;
  lastSceneTimestamp = null;
  resetClock = true;
  status.textContent = state.scene === 'bouquet' && !ready ? (workerError || 'Loading the Python renderer…') : '';
  syncSceneControls();
  if (autoFit) fitScreen();
  redraw();
});
seasonSelect.addEventListener('change', () => { state.season = seasonSelect.value; redraw(); });
waterSelect.addEventListener('change', () => { state.waterColor = waterSelect.value; redraw(); });
fishSelect.addEventListener('change', () => { state.fishColor = fishSelect.value; redraw(); });
oceanSelect.addEventListener('change', () => { state.oceanTime = oceanSelect.value; redraw(); });
fireworkSelect.addEventListener('change', () => { state.fireworkColor = fireworkSelect.value; redraw(); });
document.querySelector('#shake').addEventListener('click', () => {
  if (state.paused) pauseButton.click();
  shakeTime = sceneTime;
  redraw();
});
flowerSelect.addEventListener('change', () => { state.flowerStyle = flowerSelect.value; redraw(); });
detailSelect.addEventListener('change', () => {
  state.detail = detailSelect.value;
  syncSceneControls();
  if (autoFit) fitScreen();
  redraw();
});
messageInput.addEventListener('input', redraw);

let zoom = 10;
let autoFit = true;
function fitScreen(minimum = 7) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  context.font = '16px Menlo, Monaco, Consolas, monospace';
  const cellWidth = context.measureText('M').width / 16;
  const columns = state.scene === 'bouquet' ? (state.detail === 'detailed' ? 300 : 212) : window.AsciiScenes.dimensions(state.scene).width;
  zoom = Math.min(18, Math.max(minimum, (screen.clientWidth - 32) / (columns * cellWidth)));
  screen.style.fontSize = `${zoom}px`;
}
document.querySelector('#zoom-in').addEventListener('click', () => { autoFit = false; zoom = Math.min(24, zoom + 1); screen.style.fontSize = `${zoom}px`; });
document.querySelector('#zoom-out').addEventListener('click', () => { autoFit = false; zoom = Math.max(3, zoom - 1); screen.style.fontSize = `${zoom}px`; });
document.querySelector('#zoom-fit').addEventListener('click', () => { autoFit = true; fitScreen(3); });
window.addEventListener('resize', () => { if (autoFit) fitScreen(); });
document.addEventListener('fullscreenchange', () => { if (autoFit) fitScreen(); });
document.querySelector('#fullscreen').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.querySelector('.terminal-window').requestFullscreen();
  } catch {
    shareStatus.textContent = 'Full screen is unavailable in this browser.';
  }
});
fitScreen();
syncSceneControls();

document.querySelector('#share').addEventListener('click', async () => {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('message', messageInput.value);
  url.searchParams.set('theme', themeNames[state.theme]);
  url.searchParams.set('speed', state.speed.toFixed(1));
  url.searchParams.set('hearts', String(state.heartCount));
  url.searchParams.set('flowers', state.flowerStyle);
  url.searchParams.set('detail', state.detail);
  url.searchParams.set('scene', state.scene);
  url.searchParams.set('season', state.season);
  url.searchParams.set('water', state.waterColor);
  url.searchParams.set('fish', state.fishColor);
  url.searchParams.set('sky', state.oceanTime);
  url.searchParams.set('fireworks', state.fireworkColor);
  shareLink.value = url.toString();
  shareLabel.hidden = false;
  try {
    await navigator.clipboard.writeText(shareLink.value);
    shareStatus.textContent = 'Link copied. Anyone with the link can see this message and scene settings.';
  } catch {
    shareStatus.textContent = 'Copy the link below to share your message and scene settings.';
    shareLink.select();
  }
});
document.addEventListener('keydown', event => {
  if (event.target.matches('input, button, textarea, select')) return;
  const key = event.key.toLowerCase();
  if (key === 'p' || event.code === 'Space') { event.preventDefault(); pauseButton.click(); }
  else if (key === '+' || key === '=') document.querySelector('#faster').click();
  else if (key === '-') document.querySelector('#slower').click();
  else if (state.scene === 'bouquet' && (key === 'c' || key === 'arrowright')) changeTheme(1);
  else if (state.scene === 'bouquet' && key === 'arrowleft') changeTheme(-1);
  else if (state.scene === 'bouquet' && key === 'h') document.querySelector('#hearts').click();
});
