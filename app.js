const screen = document.querySelector('#screen');
const messageInput = document.querySelector('#message');
const pauseButton = document.querySelector('#pause');
const slowerButton = document.querySelector('#slower');
const fasterButton = document.querySelector('#faster');
const colorsButton = document.querySelector('#colors');
const heartsButton = document.querySelector('#hearts');
const nextButton = document.querySelector('#surprise');

const themes = [
  { name: 'Original', flowers: ['#d96c8a', '#e8a94b', '#d7e26d'], center: '#f0c15b', green: '#71b37c', paper: '#a8b2a7', ribbon: '#d96c8a' },
  { name: 'Ember', flowers: ['#f0784b', '#e4b84f', '#c95050'], center: '#6f3030', green: '#78936b', paper: '#9a9b8e', ribbon: '#e0784b' },
  { name: 'Violet', flowers: ['#a994e8', '#776fc4', '#c9c2e8'], center: '#d4b85c', green: '#6c9d78', paper: '#9ca2b2', ribbon: '#8f83d0' },
  { name: 'Garden', flowers: ['#e2e8d2', '#d46d8d', '#e0b94f'], center: '#a86c35', green: '#63a475', paper: '#a8b0a0', ribbon: '#73b28b' },
  { name: 'Midnight', flowers: ['#7399e5', '#9e7ad4', '#d4c8e8'], center: '#69c2b6', green: '#4f8d82', paper: '#8791a3', ribbon: '#7187d4' },
  { name: 'Monochrome', flowers: ['#d6dedf', '#8e9aa0', '#f0f3ef'], center: '#7a868a', green: '#71877d', paper: '#9ba4a4', ribbon: '#aab6b9' },
  { name: 'Amber', flowers: ['#e4a64a', '#d77b47', '#f0cf70'], center: '#653d29', green: '#6c9569', paper: '#9d9b89', ribbon: '#d49242' },
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
  return screen.clientWidth < 620 ? 56 : Math.min(140, Math.max(72, Math.floor(screen.clientWidth / 9)));
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
    ['   .   ', '  .^.  ', ' .^^^. ', '.^^^^^.', ' .^^^. '].forEach((row, dy) => [...row].forEach((char, dx) => {
      if (char !== ' ') put(grid, x + dx - 2, y + dy - 1, char, color, z + 2);
    }));
    return;
  }
  const radius = size;
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius * 2; dx <= radius * 2; dx += 1) {
      const nx = dx / (radius * 2);
      const ny = dy / radius;
      const distance = Math.sqrt(nx * nx + ny * ny);
      if (distance > 1) continue;
      const angle = Math.atan2(ny, nx);
      const petalEdge = .42 + .58 * Math.abs(Math.cos(5 * angle));
      if (distance < .28) {
        put(grid, x + dx, y + dy, distance < .13 ? '@' : 'o', center, z + 3);
      } else if (distance < petalEdge) {
        const chars = distance > .82 ? '+' : distance > .62 ? '*' : '#';
        put(grid, x + dx, y + dy, chars, color, z + 2);
      }
    }
  }
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
  const base = rows - 6;
  const spread = Math.min(cols * .30, 40);

  for (let i = 0; i < flowerCount; i += 1) {
    const ratio = flowerCount === 1 ? .5 : i / (flowerCount - 1);
    const arc = (ratio - .5) * Math.PI * .88;
    const radius = spread * (.50 + (i % 4) * .12);
    const x3 = Math.sin(arc) * radius;
    const z3 = Math.cos(arc) * radius;
    const y3 = 7 + Math.sin(ratio * Math.PI) * 12 - (i % 3) * 1.4;
    const xr = x3 * Math.cos(angle) - z3 * Math.sin(angle);
    const depth = z3 * Math.cos(angle) + x3 * Math.sin(angle);
    const sway = Math.sin(t * 1.3 + i * 1.7) * (1.5 + i / flowerCount);
    const fx = Math.round(cx + (xr + sway) * bloom);
    const fy = Math.round(base - y3 * bloom * .82);
    line(grid, cx + Math.round(Math.sin(t * .8) * 2), base + 1, fx, fy + 3, i % 3 ? '|' : '/', theme.green, depth);
    if (i % 2 === 0) {
      put(grid, Math.round((cx + fx) / 2), Math.round((base + fy) / 2), i % 4 ? '%' : '*', theme.green, depth + .1);
      put(grid, Math.round((cx + fx) / 2) + 2, Math.round((base + fy) / 2) + 1, '\\', theme.green, depth + .1);
    }
    drawFlower(grid, fx, fy, i % 4 === 0 ? 5 : 4, theme.flowers[i % theme.flowers.length], theme.center, i % 5 === 0, depth + 2);
  }

  // Dense filler branches and the folded paper wrap.
  for (let i = 0; i < 18; i += 1) {
    const branchX = cx + Math.round((i - 9) * spread * .055);
    const branchY = base - 7 - (i % 5) * 2;
    line(grid, cx, base + 1, branchX, branchY, i % 2 ? ':' : '.', theme.green, -10);
    put(grid, branchX + (i % 3) - 1, branchY, '+', theme.paper, -9);
  }
  for (let y = base + 1; y < rows - 2; y += 1) {
    const half = Math.round((y - base) * .8) + 5;
    line(grid, cx - half, y, cx + half, y, y === base + 1 ? '=' : '-', theme.paper, -20);
  }
  line(grid, cx - 7, base + 3, cx + 7, base + 3, '=', theme.ribbon, -19);
  line(grid, cx - 2, base + 4, cx - 10, base + 10, '\\', theme.ribbon, -19);
  line(grid, cx + 2, base + 4, cx + 10, base + 10, '/', theme.ribbon, -19);

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
