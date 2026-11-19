const screen = document.querySelector('#screen');
const messageInput = document.querySelector('#message');
const pauseButton = document.querySelector('#pause');
const status = document.querySelector('#render-status');
const worker = new Worker('renderer-worker.js', { type: 'module' });
const themeNames = ['Original', 'Romantic', 'Sunset', 'Lavender Garden', 'Spring', 'Midnight', 'Monochrome'];
const state = { paused: false, speed: 0.6, theme: 0, heartCount: 18 };
let ready = false;
let inFlight = false;
let lastRequest = 0;

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

function requestFrame(now) {
  if (ready && !inFlight && now - lastRequest >= 1000 / 24) {
    inFlight = true;
    lastRequest = now;
    worker.postMessage({ type: 'frame', timestamp: now, ...state, message: messageInput.value });
  }
  requestAnimationFrame(requestFrame);
}

worker.onmessage = ({ data }) => {
  if (data.type === 'ready') {
    ready = true;
    status.textContent = '';
  } else if (data.type === 'frame') {
    displayFrame(data.frame);
    inFlight = false;
  } else if (data.type === 'error') {
    ready = false;
    status.textContent = `Unable to start the bouquet: ${data.message}. Refresh to try again.`;
  }
};
worker.onerror = () => { status.textContent = 'Unable to load the Python renderer. Check your connection and refresh.'; };
worker.postMessage({ type: 'init' });
requestAnimationFrame(requestFrame);

function changeTheme(direction) {
  state.theme = (state.theme + direction + themeNames.length) % themeNames.length;
}
pauseButton.addEventListener('click', () => {
  state.paused = !state.paused;
  pauseButton.textContent = state.paused ? 'RESUME' : 'PAUSE';
  pauseButton.setAttribute('aria-pressed', String(state.paused));
});
document.querySelector('#slower').addEventListener('click', () => { state.speed = Math.max(0.1, state.speed - 0.1); });
document.querySelector('#faster').addEventListener('click', () => { state.speed = Math.min(3, state.speed + 0.1); });
document.querySelector('#colors').addEventListener('click', () => changeTheme(1));
document.querySelector('#hearts').addEventListener('click', () => { state.heartCount = Math.min(100, state.heartCount + 3); });
document.querySelector('#surprise').addEventListener('click', () => changeTheme(1));
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
