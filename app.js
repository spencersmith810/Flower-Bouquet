const canvas = document.querySelector('#bouquet');
const ctx = canvas.getContext('2d');
const themesEl = document.querySelector('#themes');
const messageEl = document.querySelector('#message');
const pauseEl = document.querySelector('#pause');
const speedEl = document.querySelector('#speed');
const speedValueEl = document.querySelector('#speed-value');
const surpriseEl = document.querySelector('#surprise');

const themes = [
  { name: 'Romantic', bg: ['#211225', '#5a2946'], flowers: ['#f6abc7', '#d96592', '#fff0f5'], centers: '#e8ad55', accent: '#f5a7c2', count: 10 },
  { name: 'Sunset', bg: ['#24131a', '#8b3e32'], flowers: ['#ff9b50', '#f7c65e', '#e85c54'], centers: '#542a2d', accent: '#ffb36a', count: 9 },
  { name: 'Lavender Garden', bg: ['#171426', '#453665'], flowers: ['#c5a9ff', '#8f6edc', '#f7eaff'], centers: '#f4cf72', accent: '#c7b0ff', count: 12 },
  { name: 'Spring', bg: ['#10201d', '#386b5a'], flowers: ['#fff6d6', '#ff9ec2', '#ffd264'], centers: '#d99134', accent: '#9fe2bb', count: 13 },
  { name: 'Midnight', bg: ['#0d1023', '#242d63'], flowers: ['#8cb6ff', '#bd8bff', '#f2d8ff'], centers: '#78d5d1', accent: '#9caeff', count: 8 },
  { name: 'Monochrome', bg: ['#17191c', '#4b5359'], flowers: ['#eef3f5', '#aab5bc', '#ffffff'], centers: '#7d8b94', accent: '#d3e1e8', count: 11 },
];

let themeIndex = 0;
let paused = false;
let speed = 1;
let start = performance.now();
let last = start;
let elapsed = 0;
const flowers = [];

function setTheme(index) {
  themeIndex = (index + themes.length) % themes.length;
  document.documentElement.style.setProperty('--accent', themes[themeIndex].accent);
  themesEl.querySelectorAll('button').forEach((button, i) => button.classList.toggle('active', i === themeIndex));
}

themes.forEach((theme, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = theme.name;
  button.addEventListener('click', () => setTheme(index));
  themesEl.append(button);
});
setTheme(0);

function seededFlowers() {
  flowers.length = 0;
  const count = themes[themeIndex].count;
  for (let i = 0; i < count; i += 1) {
    const angle = -Math.PI * .92 + (i / Math.max(1, count - 1)) * Math.PI * .84;
    const radius = .15 + (i % 4) * .045;
    flowers.push({
      x: Math.cos(angle) * radius,
      y: .16 + Math.sin(angle) * radius * .62,
      size: .09 + (i % 3) * .014,
      phase: i * 1.71,
      petals: 5 + (i % 4),
      kind: i % 5 === 0 ? 'tulip' : 'round',
    });
  }
}

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

function flower(x, y, size, petals, color, center, kind, sway) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(sway * .35);
  if (kind === 'tulip') {
    ctx.beginPath();
    ctx.moveTo(-size, size * .2);
    ctx.quadraticCurveTo(-size * .9, -size * 1.05, 0, -size * .35);
    ctx.quadraticCurveTo(size * .9, -size * 1.05, size, size * .2);
    ctx.quadraticCurveTo(size * .55, size * .72, 0, size * .35);
    ctx.quadraticCurveTo(-size * .55, size * .72, -size, size * .2);
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    for (let i = 0; i < petals; i += 1) {
      ctx.save();
      ctx.rotate((Math.PI * 2 * i) / petals);
      ctx.beginPath();
      ctx.ellipse(0, -size * .62, size * .28, size * .72, 0, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, size * .32, 0, Math.PI * 2);
    ctx.fillStyle = center;
    ctx.fill();
  }
  ctx.restore();
}

function draw(now) {
  const theme = themes[themeIndex];
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const dt = Math.min(.05, (now - last) / 1000);
  last = now;
  if (!paused) elapsed += dt * speed;
  const t = elapsed;
  const scale = Math.min(width, height) * 1.03;

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, theme.bg[0]);
  gradient.addColorStop(1, theme.bg[1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = .18;
  for (let i = 0; i < 26; i += 1) {
    const x = (Math.sin(i * 72.3) * .5 + .5) * width;
    const y = ((i * 47 + t * (7 + i % 4)) % (height + 30)) - 15;
    ctx.fillStyle = theme.flowers[i % theme.flowers.length];
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.restore();

  const cx = width / 2;
  const baseY = height * .84;
  const wind = Math.sin(t * .85) * .035 + Math.sin(t * 1.9) * .012;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#5e9b72';
  ctx.lineWidth = Math.max(2, scale * .008);
  flowers.forEach((item, i) => {
    const sway = wind * (1 + i * .035) + Math.sin(t * 1.4 + item.phase) * .012;
    const fx = cx + item.x * scale + sway * scale;
    const fy = height * .34 - item.y * scale + Math.sin(t * 1.3 + item.phase) * 2;
    ctx.beginPath();
    ctx.moveTo(cx + (i - flowers.length / 2) * scale * .012, baseY);
    ctx.quadraticCurveTo(cx + sway * scale * .35, height * .55, fx, fy + item.size * scale * .45);
    ctx.stroke();
    if (i % 2 === 0) {
      ctx.fillStyle = '#64a878';
      ctx.beginPath();
      ctx.ellipse(cx + sway * scale * .5 + item.x * scale * .55, height * .62 + i * 2, scale * .06, scale * .018, sway, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Paper wrap and ribbon.
  ctx.fillStyle = 'rgba(242, 226, 214, .85)';
  ctx.beginPath();
  ctx.moveTo(cx - scale * .22, baseY - scale * .06);
  ctx.lineTo(cx + scale * .22, baseY - scale * .06);
  ctx.lineTo(cx + scale * .12, height * .96);
  ctx.lineTo(cx - scale * .12, height * .96);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = scale * .015;
  ctx.beginPath();
  ctx.ellipse(cx, baseY - scale * .065, scale * .22, scale * .035, 0, 0, Math.PI * 2);
  ctx.stroke();

  flowers.forEach((item, i) => {
    const sway = wind * (1 + i * .035) + Math.sin(t * 1.4 + item.phase) * .012;
    const fx = cx + item.x * scale + sway * scale;
    const fy = height * .34 - item.y * scale + Math.sin(t * 1.3 + item.phase) * 2;
    const breathe = 1 + Math.sin(t * 2 + item.phase) * .035;
    flower(fx, fy, item.size * scale * breathe, item.petals, theme.flowers[i % theme.flowers.length], theme.centers, item.kind, sway);
  });

  ctx.fillStyle = theme.accent;
  ctx.font = `600 ${Math.max(14, scale * .027)}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(messageEl.value || 'for you ♥', cx, height - 24);
  requestAnimationFrame(draw);
}

pauseEl.addEventListener('click', () => {
  paused = !paused;
  pauseEl.textContent = paused ? 'Resume' : 'Pause';
});
speedEl.addEventListener('input', () => {
  speed = Number(speedEl.value);
  speedValueEl.textContent = `${speed}×`;
});
surpriseEl.addEventListener('click', () => setTheme(Math.floor(Math.random() * themes.length)));
document.addEventListener('keydown', (event) => {
  if (event.target.matches('input')) return;
  if (event.code === 'Space') { event.preventDefault(); pauseEl.click(); }
  if (event.key === 'ArrowRight') setTheme(themeIndex + 1);
  if (event.key === 'ArrowLeft') setTheme(themeIndex - 1);
});

// Rebuild the arrangement whenever the visitor changes the bouquet theme.
const originalSetTheme = setTheme;
setTheme = (index) => { originalSetTheme(index); seededFlowers(); };
setTheme(0);
requestAnimationFrame(draw);
