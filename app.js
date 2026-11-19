const screen = document.querySelector('#screen');
const messageInput = document.querySelector('#message');
const pauseButton = document.querySelector('#pause');
const status = document.querySelector('#render-status');
const themeSelect = document.querySelector('#theme');
const flowerSelect = document.querySelector('#flowers');
const detailSelect = document.querySelector('#detail');
const terminalTitle = document.querySelector('.terminal-title');
const speedValue = document.querySelector('#speed-value');
const shareStatus = document.querySelector('#share-status');
const shareLink = document.querySelector('#share-link');
const shareLabel = document.querySelector('#share-link-label');
const worker = new Worker('renderer-worker.js?v=20261119c', { type: 'module' });
const themeNames = ['Original', 'Romantic', 'Sunset', 'Lavender Garden', 'Spring', 'Midnight', 'Monochrome'];
const flowerStyles = ['original', 'roses', 'sunflowers', 'mixed'];
const detailLevels = ['classic', 'detailed'];
const params = new URLSearchParams(window.location.search);
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
};
if (params.has('message')) messageInput.value = params.get('message').slice(0, 42);
themeSelect.selectedIndex = state.theme;
flowerSelect.value = state.flowerStyle;
detailSelect.value = state.detail;
speedValue.textContent = state.speed.toFixed(1);
pauseButton.textContent = state.paused ? 'RESUME' : 'PAUSE';
pauseButton.setAttribute('aria-pressed', String(state.paused));
let ready = false;
let inFlight = false;
let needsFrame = true;
let resetClock = false;
let timer = null;
let frameStarted = 0;

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
  if (!ready || inFlight || timer !== null || (state.paused && !needsFrame)) return;
  timer = setTimeout(() => {
    timer = null;
    if (!ready || inFlight || (state.paused && !needsFrame)) return;
    inFlight = true;
    needsFrame = false;
    frameStarted = performance.now();
    worker.postMessage({ type: 'frame', timestamp: frameStarted, ...state,
      message: messageInput.value, resetClock });
    resetClock = false;
  }, delay);
}

function redraw() {
  needsFrame = true;
  scheduleFrame();
}

worker.onmessage = ({ data }) => {
  if (data.type === 'loading') {
    status.textContent = data.message;
  } else if (data.type === 'ready') {
    ready = true;
    status.textContent = '';
    scheduleFrame();
  } else if (data.type === 'frame') {
    displayFrame(data.frame);
    inFlight = false;
    scheduleFrame(state.paused ? 0 : Math.max(0, 1000 / 24 - (performance.now() - frameStarted)));
  } else if (data.type === 'error') {
    ready = false;
    status.textContent = `Unable to start the bouquet: ${data.message}. Refresh to try again.`;
  }
};
worker.onerror = () => { status.textContent = 'Unable to load the Python renderer. Check your connection and refresh.'; };
worker.postMessage({ type: 'init' });

function changeTheme(direction) {
  state.theme = (state.theme + direction + themeNames.length) % themeNames.length;
  themeSelect.selectedIndex = state.theme;
  redraw();
}
pauseButton.addEventListener('click', () => {
  state.paused = !state.paused;
  resetClock = true;
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
flowerSelect.addEventListener('change', () => { state.flowerStyle = flowerSelect.value; redraw(); });
detailSelect.addEventListener('change', () => {
  state.detail = detailSelect.value;
  terminalTitle.textContent = state.detail === 'detailed'
    ? 'Flower Bouquet — Python bouquet3d.py — 301×76'
    : 'Flower Bouquet — Python bouquet3d.py — 213×54';
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
  const columns = state.detail === 'detailed' ? 300 : 212;
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
if (state.detail === 'detailed') terminalTitle.textContent = 'Flower Bouquet — Python bouquet3d.py — 301×76';

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
  shareLink.value = url.toString();
  shareLabel.hidden = false;
  try {
    await navigator.clipboard.writeText(shareLink.value);
    shareStatus.textContent = 'Link copied. Anyone with the link can see this message and bouquet settings.';
  } catch {
    shareStatus.textContent = 'Copy the link below to share your message and bouquet settings.';
    shareLink.select();
  }
});
document.addEventListener('keydown', event => {
  if (event.target.matches('input, button, textarea, select')) return;
  const key = event.key.toLowerCase();
  if (key === 'p' || event.code === 'Space') { event.preventDefault(); pauseButton.click(); }
  else if (key === '+' || key === '=') document.querySelector('#faster').click();
  else if (key === '-') document.querySelector('#slower').click();
  else if (key === 'c' || key === 'arrowright') changeTheme(1);
  else if (key === 'arrowleft') changeTheme(-1);
  else if (key === 'h') document.querySelector('#hearts').click();
});
