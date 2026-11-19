const screen = document.querySelector('#screen');
const messageInput = document.querySelector('#message');
const pauseButton = document.querySelector('#pause');
const slowerButton = document.querySelector('#slower');
const fasterButton = document.querySelector('#faster');
const colorsButton = document.querySelector('#colors');
const heartsButton = document.querySelector('#hearts');
const nextButton = document.querySelector('#surprise');

const themes = [
  { name: 'Original', flowers: ['#f4a6c5', '#ff759f', '#ffd36d'], center: '#e6b85c', green: '#5da66e', paper: '#e8ded1', ribbon: '#f19aba' },
  { name: 'Romantic', flowers: ['#f6abc7', '#d96592', '#fff0f5'], center: '#e8ad55', green: '#5e9b72', paper: '#f2e7de', ribbon: '#e985ad' },
  { name: 'Sunset', flowers: ['#ff9b50', '#f7c65e', '#e85c54'], center: '#632f32', green: '#648a62', paper: '#e9d8c8', ribbon: '#e87550' },
  { name: 'Lavender Garden', flowers: ['#c5a9ff', '#8f6edc', '#f7eaff'], center: '#f4cf72', green: '#669b78', paper: '#ddd8e9', ribbon: '#ad8eeb' },
  { name: 'Spring', flowers: ['#fff6d6', '#ff9ec2', '#ffd264'], center: '#d99134', green: '#5ba472', paper: '#e4e6d7', ribbon: '#7dc99a' },
  { name: 'Midnight', flowers: ['#8cb6ff', '#bd8bff', '#f2d8ff'], center: '#78d5d1', green: '#538b81', paper: '#c4c8dc', ribbon: '#8e9ef7' },
  { name: 'Monochrome', flowers: ['#eef3f5', '#aab5bc', '#ffffff'], center: '#7d8b94', green: '#71877d', paper: '#d9dde0', ribbon: '#aebcc5' },
];

const presets = [[10, 2], [9, 4], [8, 3], [12, 2], [14, 4], [7, 2], [11, 3]];
let themeIndex = 0;
let flowerCount = presets[0][0];
let heartCount = 12;
let speed = .6;
let paused = false;
let elapsed = 0;
let last = performance.now();
let bloomStart = performance.now();

function setTheme(next) {
  themeIndex = (next + themes.length) % themes.length;
  flowerCount = presets[themeIndex][0];
  bloomStart = performance.now();
}

function fit() {
  return screen.clientWidth < 620 ? 56 : Math.min(88, Math.max(64, Math.floor(screen.clientWidth / 8.4)));
}

function put(grid, x, y, char, color, z = 0) {
  if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) return;
  if (z >= grid[y][x].z) grid[y][x] = { char, color, z };
}

function line(grid, x1, y1, x2, y2, char, color, z = 0) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  for (let i = 0; i <= steps; i += 1) {
    const p = steps ? i / steps : 0;
    put(grid, Math.round(x1 + (x2 - x1) * p), Math.round(y1 + (y2 - y1) * p), char, color, z);
  }
}

function drawFlower(grid, x, y, size, color, center, tulip, z) {
  if (tulip) {
    ['  .  ', ' .^. ', '.^^^.', '.^.^.'].forEach((row, dy) => [...row].forEach((char, dx) => {
      if (char !== ' ') put(grid, x + dx - 2, y + dy - 1, char, color, z + 2);
    }));
    return;
  }
  const petals = size > 3 ? [[0, -2], [-2, -1], [2, -1], [-2, 1], [2, 1], [0, 2]] : [[0, -1], [-1, 0], [1, 0], [0, 1]];
  petals.forEach(([dx, dy]) => put(grid, x + dx, y + dy, size > 3 ? '#' : '*', color, z + 2));
  put(grid, x, y, 'o', center, z + 3);
}

function render(now) {
  const cols = fit();
  const rows = window.innerWidth < 620 ? 27 : 32;
  const theme = themes[themeIndex];
  const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ char: ' ', color: '', z: -Infinity })));
  if (!paused) elapsed += Math.min(.05, (now - last) / 1000) * speed;
  last = now;
  const t = elapsed;
  const bloom = Math.min(1, (now - bloomStart) / 1400);
  const angle = t;
  const cx = Math.floor(cols / 2);
  const base = rows - 7;
  const spread = Math.min(cols * .34, 27);

  for (let i = 0; i < flowerCount; i += 1) {
    const ratio = flowerCount === 1 ? .5 : i / (flowerCount - 1);
    const arc = (ratio - .5) * Math.PI * .92;
    const radius = spread * (.55 + (i % 3) * .13);
    const x3 = Math.sin(arc) * radius;
    const z3 = Math.cos(arc) * radius;
    const y3 = 7 - Math.sin(ratio * Math.PI) * 8 - (i % 3) * 1.2;
    const xr = x3 * Math.cos(angle) - z3 * Math.sin(angle);
    const depth = z3 * Math.cos(angle) + x3 * Math.sin(angle);
    const sway = Math.sin(t * 1.3 + i * 1.7) * (1 + i / flowerCount);
    const fx = Math.round(cx + (xr + sway) * bloom / 8);
    const fy = Math.round(base - y3 * bloom * .62);
    line(grid, cx + Math.round(Math.sin(t * .8) * 2), base + 1, fx, fy + 2, '|', theme.green, depth);
    if (i % 2 === 0) put(grid, Math.round((cx + fx) / 2), Math.round((base + fy) / 2), '/', theme.green, depth + .1);
    drawFlower(grid, fx, fy, i % 3 === 0 ? 4 : 3, theme.flowers[i % theme.flowers.length], theme.center, i % 5 === 0, depth + 2);
  }

  for (let y = base + 1; y < rows - 2; y += 1) {
    const half = Math.round((y - base) * .42) + 3;
    line(grid, cx - half, y, cx + half, y, y === base + 1 ? '_' : '.', theme.paper, -20);
  }
  line(grid, cx - 4, base + 3, cx + 4, base + 3, '=', theme.ribbon, -19);
  line(grid, cx - 2, base + 4, cx - 7, base + 8, '\\', theme.ribbon, -19);
  line(grid, cx + 2, base + 4, cx + 7, base + 8, '/', theme.ribbon, -19);

  for (let i = 0; i < heartCount; i += 1) {
    const phase = i * 2.31;
    const hx = Math.floor(((i * 19 + Math.sin(t * .8 + phase) * 4) % (cols - 2)) + 1);
    const hy = Math.floor(rows - 3 - ((t * (2 + (i % 3) * .4) + i * 3) % (rows - 7)));
    put(grid, hx, hy, '♥', theme.flowers[(i + 1) % theme.flowers.length], -50);
  }

  const message = messageInput.value || 'for you ♥';
  const messageStart = Math.max(0, Math.floor((cols - message.length) / 2));
  [...message].forEach((char, i) => put(grid, messageStart + i, rows - 2, char, theme.flowers[(i + Math.floor(t * 5)) % theme.flowers.length], 100));
  const hint = `${theme.name}  •  P pause  +/- speed  C colors  H hearts`;
  [...hint].forEach((char, i) => put(grid, Math.min(cols - 1, Math.max(0, Math.floor((cols - hint.length) / 2) + i)), rows - 1, char, '#89909a', 100));

  screen.innerHTML = grid.map(row => row.map(cell => cell.char === ' ' ? ' ' : `<span style="color:${cell.color}">${cell.char}</span>`).join('')).join('\n');
  requestAnimationFrame(render);
}

pauseButton.addEventListener('click', () => { paused = !paused; pauseButton.textContent = paused ? 'Resume' : 'Pause'; });
slowerButton.addEventListener('click', () => { speed = Math.max(.1, speed - .1); });
fasterButton.addEventListener('click', () => { speed = Math.min(2, speed + .1); });
colorsButton.addEventListener('click', () => setTheme(themeIndex + 1));
heartsButton.addEventListener('click', () => { heartCount = heartCount >= 30 ? 6 : heartCount + 3; });
nextButton.addEventListener('click', () => setTheme(themeIndex + 1));
document.addEventListener('keydown', (event) => {
  if (event.target.matches('input')) return;
  if (event.key.toLowerCase() === 'p' || event.code === 'Space') { event.preventDefault(); pauseButton.click(); }
  if (event.key === '+' || event.key === '=') fasterButton.click();
  if (event.key === '-') slowerButton.click();
  if (event.key.toLowerCase() === 'c') colorsButton.click();
  if (event.key.toLowerCase() === 'h') heartsButton.click();
  if (event.key === 'ArrowRight') nextButton.click();
  if (event.key === 'ArrowLeft') setTheme(themeIndex - 1);
});

requestAnimationFrame(render);
