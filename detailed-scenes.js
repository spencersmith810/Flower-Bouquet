/* Full-resolution ASCII artwork. Scene coordinates are character cells on a 300×90 grid. */
(function () {
  const WIDTH = 300, HEIGHT = 90;
  const PI = Math.PI;
  const palettes = {
    spring: [218, 225, 211, 114], summer: [34, 71, 77, 114],
    autumn: [130, 166, 172, 214], winter: [250, 254, 231, 117],
    rainbow: [196, 208, 226, 46, 45, 141, 213],
    warm: [196, 208, 220, 211, 231], cool: [39, 45, 141, 213, 231],
  };
  const hash = n => { const v = Math.sin(n * 127.1 + 17.7) * 43758.5453; return v - Math.floor(v); };
  const mod = (n, size) => ((n % size) + size) % size;

  // Shared by both renderers: each school has a lane, a speed, and evenly spaced positions.
  function aquariumLayout({ left, right, time, classic, fishWidth, sharkWidth, pufferWidth }) {
    const lanes = classic ? [5, 11, 17, 23, 30, 36] : [10, 19, 28, 37, 47, 56];
    const sway = Math.round(Math.sin(time * .55) * .6);
    const placements = [];
    function add(kind, lane, width, height, count, direction, speed, initial, firstIndex = 0) {
      const range = right - left + width;
      for (let i = 0; i < count; i++) {
        const travel = mod(initial + time * speed + i * (width + 12), range);
        placements.push({ kind, x: Math.round(direction > 0 ? left - width + travel : right - travel),
          y: lanes[lane] + sway, width, height, direction, index: firstIndex + i });
      }
    }
    add('shark', 0, sharkWidth, 5, 1, 1, 2.4, sharkWidth + 25);
    add('fish', 1, fishWidth, classic ? 5 : 6, 2, 1, 3.8, fishWidth + 45, 0);
    add('fish', 2, fishWidth, classic ? 5 : 6, 2, -1, 3.3, 30, 2);
    add('puffer', 3, pufferWidth, classic ? 6 : 7, 1, -1, 1.8, 75);
    add('fish', 4, fishWidth, classic ? 5 : 6, 2, 1, 2.9, fishWidth + 25, 4);
    add('fish', 5, fishWidth, classic ? 5 : 6, 3, -1, 3.2, 20, 6);
    return placements;
  }

  function animateFishTail(shape, time) {
    if (Math.sin(time * 4) <= 0) return shape;
    return shape.map(row => row.replace('<  >', '<  |'));
  }

  function render(scene, options = {}) {
    const t = Number.isFinite(options.time) ? options.time : 0;
    const rows = Array.from({ length: HEIGHT }, () => Array.from({ length: WIDTH }, () => [' ', 0]));
    function put(x, y, char, color = 255) {
      x = Math.round(x); y = Math.round(y);
      if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) rows[y][x] = [char, color];
    }
    function text(x, y, str, color = 255) {
      Array.from(str).forEach((char, i) => { if (char !== ' ') put(x + i, y, char, color); });
    }
    function sprite(x, y, lines, color) { lines.forEach((row, i) => text(x, y + i, row, color)); }
    function line(x1, y1, x2, y2, char, color) {
      const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
      for (let i = 0; i <= steps; i++) put(x1 + (x2 - x1) * i / steps, y1 + (y2 - y1) * i / steps, char, color);
    }
    function ellipse(cx, cy, rx, ry, char, color, density = 300) {
      for (let i = 0; i < density; i++) { const a = i * 2 * PI / density; put(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, char, color); }
    }
    function stars(count, top = 2, bottom = 50) {
      for (let i = 0; i < count; i++) put(2 + hash(i + 1300) * 295, top + hash(i + 1400) * (bottom - top), Math.sin(t * 1.2 + i) > .95 ? '*' : '.', i % 7 ? 244 : 230);
    }
    function mountain(base, color, peaks, lit = false) {
      for (let i = 0; i < peaks.length - 1; i++) {
        const [x, y] = peaks[i], [nx, ny] = peaks[i + 1];
        line(x, y, nx, ny, ny < y ? '/' : '\\', color);
      }
      for (let i = 1; i < peaks.length - 1; i += 2) {
        const [x,y] = peaks[i];
        sprite(x - 5, y + 2, ['   /\\', '  /  \\', ' / /\\ \\'], lit ? 255 : 110);
        for (let j = 0; j < 12; j++) put(x + (hash(i * 99 + j) - .5) * 35, y + 5 + hash(i * 199 + j) * (base - y - 5), j % 3 ? '.' : '/', lit ? 252 : 60);
      }
    }
    const peaks = [[0,64],[34,43],[54,56],[96,31],[122,53],[166,38],[190,53],[233,33],[262,55],[299,44]];
    function moon(cx, cy, rx = 13, ry = 7) {
      const craters = [
        [-.48, -.18, .16], [-.18, -.48, .12], [.18, -.28, .2],
        [.48, -.02, .13], [-.25, .18, .22], [.15, .38, .14],
      ];
      for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
        const d = (x / rx) ** 2 + (y / ry) ** 2;
        if (d <= 1) {
          const nx = x / rx, ny = y / ry;
          const crater = craters.find(([craterX, craterY, radius]) =>
            ((nx - craterX) ** 2 + (ny - craterY) ** 2) < radius ** 2);
          const char = crater ? (d > .82 ? '*' : crater[2] > .17 ? 'o' : '.') : d > .85 ? '*' : ':';
          put(cx + x, cy + y, char, crater ? 230 : 250);
        }
      }
    }
    function pine(cx, ground, height, color = 29) {
      for (let y = 0; y < height; y++) {
        const w = Math.floor(y * .55);
        put(cx - w, ground - height + y, '/', color); put(cx + w, ground - height + y, '\\', color);
        if (y % 3 === 2) for (let x = -w + 1; x < w; x += 3) put(cx + x, ground - height + y, y % 2 ? '^' : ',', color);
      }
      text(cx - 1, ground, '||', 137);
    }
    function particles(count, maxY, speed, char, color, seed = 0) {
      for (let i = 0; i < count; i++) {
        const x = mod(hash(i + 3000 + seed) * WIDTH + t * speed * .4 + Math.sin(t + i), WIDTH);
        const y = mod(hash(i + 4000 + seed) * maxY + t * speed, maxY);
        put(x, y, char, color);
      }
    }

    if (scene === 'aquarium') {
      const water = options.waterColor === 'teal' ? [23, 30, 37, 44] : options.waterColor === 'purple' ? [54, 60, 97, 141] : [24, 25, 67, 75];
      const fishColors = options.fishColor === 'coral' ? [203, 209, 214, 216] : options.fishColor === 'cool' ? [75, 81, 117, 141] : [214, 211, 81, 209];
      line(2, 5, 297, 5, '~', water[3]);
      // Gentle surface ripples and sparse bubbles leave the swimming fish readable.
      for (let x = 12; x < 290; x += 36) text(x + Math.sin(t * .5 + x), 7, '~   ~', water[1]);
      for (let i = 0; i < 35; i++) put(5 + hash(i + 520) * 290 + Math.sin(t + i), 9 + mod(hash(i + 521) * 61 - t * (2 + i % 3), 61), i % 4 ? '.' : 'o', water[2]);
      for (let i = 0; i < 320; i++) put(hash(i + 50) * 295, 72 + hash(i + 51) * 13, ['.', ',', ':', '`'][i % 4], [101, 137, 144, 180][i % 4]);
      // Reef and rock outlines sit behind the fish and plants.
      sprite(24, 68, ['      ___       ___', '  _.-\'   `-._.-\'   `-._', ' /     .    /     .     \\', '/__..______/___..________\\'], 102);
      sprite(219, 66, ['        _______       ____', '  __.-\'       `-.__.-\'    `-.', ' /    .      .   /  .         \\', '/_____..________/________..____\\'], 102);
      sprite(166, 65, ['       __      ___', '   _.-\'  `-._./   `-._', '  /   .     /   .     \\', ' /__.._____/____.._____\\'], 102);
      const fish = [
        ['          .-~~~~~~~~-.', '  /\\    .\'            `.', ' <  >--(    ))       o   )>', '  \\/    `._          _.\'', '           `--------\''],
        ['         .-^^^^^^-.', '  /\\  .\'          `.', ' <  >-(    / /    o  )>', '  \\/  `._          _.\'', '         `--------\''],
        ['       .-~~~~~~~-.', '  /\\ /           \\', ' <  >|   :::    o  )>', '  \\/ \\           /', '       `-_______-\''],
        ['            /\\', '      .----/  \\---.', '  /\\/    / /     o \\', ' <  >      /        )>', '  \\/\\_____________/', '            \\/'],
      ];
      const mirror = str => [...str].reverse().map(c => ({'<':'>','>':'<','(':')',')':'(','/':'\\','\\':'/'})[c] || c).join('');
      for (let i = 0; i < 24; i++) {
        const root = 5 + i * 12, h = 8 + Math.floor(hash(i + 90) * 15);
        for (let j = 0; j < h; j++) {
          const x = root + Math.sin(t * .8 + i + j * .2) * j * .13;
          put(x, 74 - j, j % 3 ? '|' : '/', [28, 34, 71, 77][i % 4]);
          if (j % 4 === 0) text(x - 2, 74 - j, '\\|/', [28, 34, 71, 77][i % 4]);
        }
      }
      for (const [x, color] of [[64,203],[143,209],[254,141]]) {
        sprite(x, 63, ['   \\  |  /', '    \\ | /', '  \\  \\|/  /', '   \\  |  /', '    \\ | /', '     \\|/', '      |', '     / \\'], color);
      }
      // Larger silhouettes swim on separate paths so both are visible as the scene starts.
      const shark = [
        '                    /\\',
        '   /\\_____________/  \\___________',
        '  <       ___      )))        o    \\_',
        '   \\/\\__/   \\___________       ____/',
        '            \\____/       \\_____/',
      ];
      const puffer = [
        '       \\  |  /',
        '      .-^^^^^-.',
        '   - /  o  .   \\ -',
        '    |  .    .   |><',
        '   - \\   .     / -',
        '      `-vvvvv-\'',
        '       /  |  \\',
      ];
      function foregroundFish(x, y, shape, color) {
        const width = Math.max(...shape.map(row => row.length));
        for (let row = 0; row < shape.length; row++) {
          for (let col = 0; col < width; col++) put(x + col, y + row, ' ', 0);
        }
        sprite(x, y, shape, color);
      }
      const widthOf = shape => Math.max(...shape.map(row => row.length));
      const placements = aquariumLayout({ left: 0, right: WIDTH, time: t, classic: false,
        fishWidth: Math.max(...fish.map(widthOf)), sharkWidth: widthOf(shark), pufferWidth: widthOf(puffer) });
      for (const placement of placements) {
        const { kind, x, y, index, direction } = placement;
        let shape = kind === 'fish' ? animateFishTail(fish[index % fish.length], t) : kind === 'shark' ? shark : puffer;
        if (kind === 'fish' && direction < 0) {
          const width = widthOf(shape);
          shape = shape.map(row => mirror(row.padEnd(width)));
        }
        foregroundFish(x, y, shape, kind === 'shark' ? 250 : fishColors[index % fishColors.length]);
      }
      text(4, 5, '[ AQUARIUM ]', water[3]);
    } else if (scene === 'space' || scene === 'earth-night') {
      stars(260, 1, 82);
      const cx = 150, cy = 43, rx = 72, ry = 36, land = window.EARTH_LAND_MASK;
      for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
        const nx = x / rx, ny = y / ry, d = nx * nx + ny * ny;
        if (d > 1) continue;
        const z = Math.sqrt(1 - d), latitude = Math.asin(-ny);
        const longitude = Math.atan2(nx, z) - PI / 2 + t * .15;
        const col = Math.min(179, Math.floor(mod(longitude + PI, 2 * PI) / (2 * PI) * 180));
        const row = Math.min(89, Math.max(0, Math.floor((PI / 2 - latitude) / PI * 90)));
        const isLand = land && land[row][col] === '1';
        const daylight = nx * .7 + z * .7 > .05;
        const polar = Math.abs(latitude) > 1.35;
        const ice = polar && isLand;
        if (scene === 'earth-night') {
          const lights = window.EARTH_NIGHT_LIGHTS;
          const lightRow = Math.min(359, Math.max(0, Math.floor((PI / 2 - latitude) / PI * 360)));
          const lightCol = Math.min(719, Math.floor(mod(longitude + PI, 2 * PI) / (2 * PI) * 720));
          const brightness = lights ? Number(lights[lightRow][lightCol]) : 0;
          put(cx + x, cy + y, brightness ? (brightness > 3 ? '*' : '+') : isLand ? ':' : '.',
            brightness ? (brightness > 3 ? 230 : 178) : ice ? 250 : isLand ? 60 : 24);
        } else {
          const color = ice ? 255 : isLand ? (daylight ? 114 : 28) : (daylight ? 75 : 24);
          put(cx + x, cy + y, ice ? '#' : isLand ? (daylight ? '%' : ':') : '+', color);
        }
      }
      moon(258, 19, 10, 5);
      const satellite = mod(t * 8, 350) - 25;
      sprite(satellite, 11, ['  |', '-[o]-', '  |'], 230);
      text(5, 3, scene === 'earth-night' ? 'EARTH AT NIGHT / NASA 2016' : 'EARTH / ROTATING GLOBE', 250);
    } else if (scene === 'solar') {
      stars(250, 1, 83);
      const cx = 145, cy = 42;
      const planets = [
        ['Mercury',17,5,1.55,250,'.'], ['Venus',28,8,1.15,222,'o'], ['Earth',39,11,.85,81,'O'], ['Mars',50,14,.64,203,'o'],
        ['Jupiter',65,19,.42,215,'@'], ['Saturn',82,24,.31,229,'O'], ['Uranus',100,29,.22,117,'o'], ['Neptune',125,35,.16,75,'o'],
      ];
      planets.forEach(([,rx,ry]) => { for (let i = 0; i < 120; i++) if (i % 2 === 0) { const a = i * 2 * PI / 120; put(cx + rx * Math.cos(a), cy + ry * Math.sin(a), '.', 238); } });
      sprite(cx - 5, cy - 2, ['   \\ | /', '  --\\|/--', ' -- (@) --', '  --/|\\--', '   / | \\'], 220);
      planets.forEach(([name,rx,ry,speed,color,ch], i) => {
        const a = t * speed * .16 + i * 1.7, x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a);
        put(x, y, ch, color); if (name === 'Jupiter') text(x - 2, y + 1, '(===)', color);
        if (name === 'Saturn') text(x - 3, y, '-(O)-', color);
      });
      text(4, 3, 'SOLAR SYSTEM / ORBITS NOT TO SCALE', 250);
      text(4, 84, 'Mercury   Venus   Earth   Mars   Jupiter   Saturn   Uranus   Neptune', 250);
    } else if (scene === 'tree') {
      const season = palettes[options.season] ? options.season : 'spring', colors = palettes[season];
      stars(50, 1, 26); mountain(65, season === 'winter' ? 110 : 60, peaks, season === 'winter');
      line(0, 71, 299, 71, '_', season === 'winter' ? 255 : 71);
      // Stream bends toward the foreground; path and shore details change with the season.
      for (let y = 68; y < 87; y++) {
        const x = 205 + (y - 68) * 2 + Math.sin(y * .3) * 4;
        text(x, y, y % 2 ? '~  ~  ~' : ' ~   ~ ', season === 'winter' ? 159 : 75);
        put(37 + (y - 68) * 2, y, '.', 180); put(51 + (y - 68) * 3, y, '.', 180);
      }
      const cx = 142, ground = 71;
      for (let y = 45; y <= ground; y++) {
        const w = 3 + Math.floor((y - 45) * .11);
        for (let x = -w; x <= w; x++) put(cx + x, y, x % 3 ? '|' : ':', 137);
      }
      for (const [dx,dy] of [[-38,-31],[-27,-38],[-14,-45],[8,-47],[25,-40],[40,-30]]) {
        line(cx, 57, cx + dx, ground + dy, dx < 0 ? '/' : '\\', 137);
        line(cx + dx * .5, 57 + (ground + dy - 57) * .5, cx + dx * 1.25, ground + dy - 3, '/', 137);
      }
      line(cx, 70, cx - 17, 76, '_', 137); line(cx, 70, cx + 19, 76, '_', 137);
      for (let i = 0; i < 1200; i++) {
        const a = hash(i + 550) * 2 * PI, radius = Math.sqrt(hash(i + 1550));
        const x = cx + Math.cos(a) * radius * 52 + Math.sin(t * .6 + i) * .4, y = 31 + Math.sin(a) * radius * 15;
        if (season !== 'winter' || i % 7 === 0) put(x, y, season === 'winter' ? '*' : ['*','+','%','o'][i % 4], colors[i % 4]);
      }
      if (season === 'winter') particles(160, 80, 3, '.', 255);
      else particles(70, 70, 1.4, season === 'spring' ? '*' : season === 'autumn' ? '+' : '.', colors[0], 55);
      for (let i = 0; i < 150; i++) put(hash(i + 2000) * 300, 73 + hash(i + 2100) * 13, season === 'winter' ? '.' : i % 3 ? ',' : 'v', season === 'winter' ? 255 : 71);
      if (mod(t, 24) < 8) text(166, 42, '(o>', 230);
      text(5, 3, season.toUpperCase() + ' / THE VALLEY', 250);
    } else if (scene === 'snowglobe') {
      stars(50, 1, 70); ellipse(150, 39, 80, 33, '.', 117, 550);
      line(83, 65, 217, 65, '_', 255); pine(140, 64, 24, 77); pine(117, 64, 16, 71); pine(180, 64, 18, 71);
      sprite(155, 55, ['    /\\', '   /  \\', '  /____\\', '  | [] |', '  | __ |', '  ||  ||'], 230);
      const kick = Math.max(0, 1 - (t - (options.shakeTime ?? -100)) / 4);
      for (let i = 0; i < 150; i++) {
        const x = 75 + mod(hash(i + 90) * 150 + Math.sin(t + i) * (2 + kick * 8), 150);
        const y = 8 + mod(hash(i + 91) * 53 + t * (2 + kick * 5), 53);
        if (((x - 150) / 78) ** 2 + ((y - 39) / 31) ** 2 < 1) put(x, y, i % 6 ? '.' : '*', 255);
      }
      line(83, 73, 217, 73, '_', 110); line(83, 73, 89, 80, '\\', 110); line(217, 73, 211, 80, '/', 110);
      line(89, 80, 211, 80, '_', 110); text(144, 77, 'WINTER GLOBE', 110);
    } else if (scene === 'ocean') {
      const night = options.oceanTime === 'night'; stars(night ? 170 : 20, 1, 40);
      if (night) moon(260, 15, 12, 6);
      else {
        for (let y = -6; y <= 6; y++) for (let x = -12; x <= 12; x++) {
          if ((x / 12) ** 2 + (y / 6) ** 2 <= 1) put(260 + x, 15 + y, x % 3 ? '+' : '*', y > 2 ? 208 : 220);
        }
        text(253, 7, '  \\  |  /', 220); text(253, 23, '  /  |  \\', 208);
      }
      for (let y = 48; y < 86; y += 2) for (let x = 0; x < WIDTH; x += 5) put(x + Math.sin(t * .8 + y * .5) * 3, y, y % 4 ? '~' : '-', night ? 67 : 81);
      // Lighthouse and sailboat give the wildlife a scale and a coastline.
      sprite(24, 26, ['       /\\', '      /__\\', '     | *  |', '     |____|', '     |    |', '     |====|', '     |    |', '     |    |', '     |====|', '     |    |', '     |    |', '   __|____|__', ' _/__________\\_'], 255);
      const bx = 112 + Math.sin(t * .4) * 7;
      line(bx, 30, bx, 49, '|', 231); line(bx + 2, 32, bx + 23, 46, '/', 230);
      sprite(bx - 16, 49, ['\\______________________________/', ' \\____________________________/'], 180);
      const jump = mod(t, 13);
      if (jump < 6) sprite(180 + jump * 8, 46 - Math.sin(jump / 6 * PI) * 13,
        ['        __', '   ____/o `-.__', ' <_____       _)>', '       `-----\''], 117);
      const whaleX = 180 + Math.sin(t * .22) * 16;
      sprite(whaleX, 65 + Math.sin(t * .5), ['              .', '          .   |   .', '       ____\\ | /____', '   _.-\'  o           `-.__', ' <_                         _)>', '   `--._________________.-\''], 117);
      text(4, 3, night ? 'OCEAN / MOONLIT COAST' : 'OCEAN / SUNSET COAST', 250);
    } else if (scene === 'rain') {
      const flash = mod(t, 17) < .24 || (mod(t, 17) > .45 && mod(t, 17) < .55);
      for (let i = 0; i < 18; i++) text(i * 18 - mod(t * .4, 18), 8 + i % 3, '.___.---.___...', flash ? 255 : 60);
      mountain(65, flash ? 255 : 67, peaks, flash);
      for (let i = 0; i < 24; i++) pine(i * 13 + 3, 75, 8 + Math.floor(hash(i + 300) * 12), flash ? 114 : 28);
      for (let i = 0; i < 300; i++) put(hash(i + 600) * 300, 50 + hash(i + 601) * 30, '.', 60);
      particles(350, 83, 13, '/', flash ? 255 : 67, 34);
      particles(100, 83, 8, '.', 110, 891);
      if (flash) sprite(223, 13, ['    /', '   /_', '    /', '   /_', '    /', '   /'], 231);
      text(4, 3, 'MOUNTAIN RAINSTORM', 250);
    } else if (scene === 'fireworks') {
      stars(130, 1, 60);
      const colors = palettes[options.fireworkColor] || palettes.rainbow;
      for (let b = 0; b < 8; b++) {
        const phase = mod(t + b * 1.4, 10), x = 18 + hash(b + 700) * 265, y = 8 + hash(b + 701) * 30;
        if (phase < 1.5) {
          const rocketY = 68 - phase / 1.5 * (68 - y); text(x, rocketY, '|', 229); text(x, rocketY + 2, ':', 208);
        } else if (phase < 6) {
          const age = phase - 1.5, radius = age * 7;
          for (let i = 0; i < 72; i++) {
            const a = i * 2 * PI / 72, shape = b % 3 === 0 ? 1 : b % 3 === 1 ? .72 + .28 * Math.cos(6 * a) : .68 + .32 * (i % 2);
            const r = radius * shape * (.9 + hash(i + b * 100) * .2), color = colors[(i + b) % colors.length];
            const sx = x + Math.cos(a) * r * 1.8, sy = y + Math.sin(a) * r * .5 + age * age * .26;
            put(sx, sy, age > 3.5 ? '.' : i % 3 ? '*' : '+', color);
            if (age > 1 && i % 3 === 0) put(x + (sx - x) * .82, y + (sy - y) * .82, '.', color);
            if (i % 6 === 0) put(sx + Math.sin(t + i) * 3, 75 + mod(i * 3 + b, 9), '~', color);
          }
        }
      }
      // Manhattan silhouettes, with taller recognizable landmark spires and river reflections.
      for (let i = 0; i < 25; i++) {
        const x = i * 12, w = 9 + i % 3, h = i === 5 ? 34 : i === 12 ? 29 : i === 17 ? 25 : 8 + Math.floor(hash(i + 50) * 15);
        for (let yy = 69 - h; yy <= 69; yy++) for (let xx = x; xx < x + w; xx++) put(xx, yy, ' ', 0);
        line(x, 69, x, 69 - h, '|', 244); line(x, 69 - h, x + w, 69 - h, '_', 244); line(x + w, 69 - h, x + w, 69, '|', 244);
        for (let yy = 71 - h; yy < 68; yy += 3) for (let xx = x + 2; xx < x + w; xx += 3) if (hash(xx * 7 + yy) > .3) put(xx, yy, '.', 221);
        if ([5,12,17].includes(i)) line(x + 5, 69 - h, x + 5, 63 - h, '|', 250);
      }
      // Stepped and pointed crowns suggest One World Trade, the Empire State, and Chrysler.
      sprite(60, 31, ['    |', '   /\\', '  /  \\', ' /____\\'], 250);
      sprite(144, 36, ['   _|_', '  |===|', ' /|===|\\', '/_|___|_\\'], 250);
      sprite(204, 39, ['    |', '   /\\', '  /^^\\', ' /_^^_\\', '/______\\'], 250);
      sprite(19, 56, ['   *', '   | /\\', '   |(oo)', '   |/|\\', '   / | \\', '  /__|__\\', '   /  \\', '  /____\\'], 115);
      line(234, 62, 234, 69, '|', 250); line(281, 62, 281, 69, '|', 250);
      line(234, 62, 257, 67, '\\', 250); line(257, 67, 281, 62, '/', 250);
      line(0, 70, 299, 70, '_', 244);
      for (let i = 0; i < 100; i++) put(hash(i + 800) * 300 + Math.sin(t + i), 72 + hash(i + 801) * 13, i % 3 ? '-' : '~', i % 4 ? 67 : 180);
      text(4, 85, 'NEW YORK CITY / FIREWORKS', 250);
    } else if (scene === 'nightsky') {
      stars(320, 1, 58); moon(252, 16, 15, 7);
      for (let i = 0; i < 240; i++) {
        const x = hash(i + 1000) * 300, y = 8 + x * .12 + (hash(i + 1100) - .5) * 12;
        put(x, y, i % 8 ? '.' : '*', i % 3 ? 60 : 110);
      }
      // Big Dipper and Orion use recognizable star patterns and subtle connecting lines.
      const dipper = [[35,15],[45,13],[55,14],[65,17],[73,17],[76,22],[66,23]];
      const orion = [[191,14],[211,14],[196,23],[200,24],[204,25],[190,34],[215,34]];
      for (const points of [dipper, orion]) points.forEach(([x,y]) => put(x, y, '*', 231));
      mountain(69, 60, peaks);
      for (let i = 0; i < 23; i++) pine(i * 14, 77, 6 + Math.floor(hash(i + 300) * 10), 29);
      const shooting = mod(t, 12); if (shooting < 1.6) text(95 + shooting * 50, 8 + shooting * 8, '---*', 231);
      text(4, 3, 'NIGHT SKY / MOUNTAINS', 250);
    }
    const message = Array.from(options.message || '').slice(0, WIDTH);
    text(Math.floor((WIDTH - message.length) / 2), 88, message.join(''), 218);
    return '\x1b[H' + rows.map(row => {
      let last = -1, out = '';
      for (const [char, color] of row) {
        if (char !== ' ' && color !== last) { out += `\x1b[38;5;${color}m`; last = color; }
        out += char;
      }
      return out;
    }).join('\n') + '\x1b[0m';
  }
  window.DetailedScenes = { render, aquariumLayout, animateFishTail };
})();
