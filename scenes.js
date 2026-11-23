/* Character-grid animations. All scenes return the same ANSI format as bouquet3d.py. */
(function () {
  const W = 110, H = 38;
  const layoutDimensions = scene => scene === 'aquarium' ? { width: 164, height: 52 }
    : ['tree', 'space', 'earth-night', 'solar', 'ocean', 'rain', 'fireworks', 'nightsky'].includes(scene)
      ? { width: 150, height: 50 } : { width: W, height: H };
  const dimensions = () => ({ width: 300, height: 90 });
  const palettes = {
    spring: [218, 225, 211, 114], summer: [34, 71, 77, 114],
    autumn: [130, 166, 172, 214], winter: [250, 254, 231, 117],
    warm: [196, 208, 220, 211, 231], cool: [39, 45, 141, 213, 231],
    rainbow: [196, 208, 226, 46, 45, 141, 213],
  };

  function render(scene, options) {
    if (options.detail !== 'classic') return window.DetailedScenes.render(scene, options);
    const { width: W, height: H } = layoutDimensions(scene);
    const t = options.time || 0;
    const rows = Array.from({ length: H }, () => Array.from({ length: W }, () => [' ', 0]));
    const labels = [];
    const put = (x, y, char, color = 255) => {
      x = Math.round(x); y = Math.round(y);
      if (x >= 0 && x < W && y >= 0 && y < H) rows[y][x] = [char, color];
    };
    const text = (x, y, str, color = 255) => {
      // Keep scene labels readable instead of stretching each letter with the artwork.
      if (/[A-Za-z]{3}/.test(str)) { labels.push({ x, y, str, color }); return; }
      [...str].forEach((ch, i) => { if (ch !== ' ') put(x + i, y, ch, color); });
    };
    const line = (x1, y1, x2, y2, char, color) => {
      const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
      for (let i = 0; i <= steps; i++) put(x1 + (x2 - x1) * i / steps, y1 + (y2 - y1) * i / steps, char, color);
    };
    const hash = n => { const x = Math.sin(n * 127.1 + 17.7) * 43758.5453; return x - Math.floor(x); };
    const stars = (count, top = 0, bottom = 26) => {
      for (let i = 0; i < count; i++) {
        const x = 3 + hash(i * 2) * (W - 6), y = top + hash(i * 2 + 1) * (bottom - top);
        put(x, y, Math.sin(t * 1.4 + i) > .75 ? '*' : '.', i % 4 ? 250 : 229);
      }
    };
    const moon = (x, y) => {
      text(x, y, '  _..._ ', 230); text(x, y + 1, ' /     )', 230);
      text(x, y + 2, '|     ( ', 230); text(x, y + 3, ' \\_____)', 230);
    };
    const mountains = (base, color = 67, highlight = 109) => {
      // Two layered ridgelines give the sky a landscape instead of an empty horizon.
      const peaks = [[0, base], [18, base - 10], [29, base - 3], [51, base - 16],
        [66, base - 5], [83, base - 13], [102, base - 3], [123, base - 14], [149, base]];
      for (let i = 0; i < peaks.length - 1; i++) {
        const [x1, y1] = peaks[i], [x2, y2] = peaks[i + 1];
        line(x1, y1, x2, y2, x2 > x1 && y2 < y1 ? '/' : '\\', color);
      }
      for (const [x, y] of [peaks[1], peaks[3], peaks[5], peaks[7]]) {
        text(x - 2, y + 1, '/\\', highlight);
        text(x - 3, y + 2, '/  \\', highlight);
      }
      for (let i = 0; i < 22; i++) {
        const x = hash(i + 1600) * W;
        put(x, base - hash(i + 1700) * 3, i % 2 ? '^' : '.', color);
      }
    };
    const newYorkSkyline = base => {
      // Stylized Manhattan landmarks: One World Trade, Empire State, and Chrysler.
      const buildings = [
        [0, 9, 7], [10, 8, 10], [19, 9, 8], [29, 10, 21], [40, 8, 9],
        [49, 11, 13], [61, 9, 10], [71, 10, 19], [82, 7, 8], [90, 9, 16],
        [100, 8, 11], [109, 10, 9], [120, 8, 12], [129, 10, 7], [140, 10, 8],
      ];
      buildings.forEach(([x, width, height], index) => {
        for (let y = base - height; y <= base; y++) {
          for (let col = x; col < x + width; col++) put(col, y, ' ', 0);
        }
        line(x, base, x, base - height, '|', 244);
        line(x, base - height, x + width - 1, base - height, '_', 244);
        line(x + width - 1, base - height, x + width - 1, base, '|', 244);
        for (let y = base - height + 2; y < base; y += 2) {
          for (let col = x + 2; col < x + width - 1; col += 3) {
            if (hash(index * 83 + y * 3 + col) > .28) put(col, y, '.', 221);
          }
        }
      });
      // Spires and stepped crowns make the landmarks identifiable at character scale.
      line(34, base - 21, 34, base - 27, '|', 250);
      text(72, base - 20, ' /==\\ ', 250); line(76, base - 20, 76, base - 25, '|', 250);
      text(91, base - 17, ' /\\_/\\ ', 250); text(92, base - 19, '/__^__\\', 250);
      line(95, base - 19, 95, base - 23, '|', 250);
      text(8, base - 9, '  *', 230); text(8, base - 8, '  | /\\', 115);
      text(8, base - 7, '  |(oo)', 115); text(8, base - 6, '  |/|\\', 115);
      text(8, base - 5, '  / |  \\', 115); text(8, base - 4, '    |', 115);
      text(8, base - 3, '   / \\', 115); text(8, base - 2, '  /___\\', 115);
      line(113, base - 5, 113, base, '|', 250);
      line(139, base - 5, 139, base, '|', 250);
      line(113, base - 5, 126, base - 1, '\\', 250);
      line(126, base - 1, 139, base - 5, '/', 250);
      line(0, base + 1, W - 1, base + 1, '_', 244);
      // East River reflections shimmer below the buildings.
      for (let i = 0; i < 35; i++) {
        const x = hash(i + 2100) * W, y = base + 2 + i % 3;
        put(x + Math.sin(t + i) * 1.5, y, i % 4 ? '-' : '~', i % 3 ? 67 : 180);
      }
    };
    const tree = (cx, ground, scale, season) => {
      const p = palettes[season] || palettes.spring;
      const top = ground - 17 * scale;
      for (let y = ground; y > ground - 8 * scale; y--) {
        text(cx - 2, y, '||#||', 137);
      }
      const ends = [[-12,-14],[-8,-17],[-3,-19],[4,-19],[10,-17],[15,-13]];
      ends.forEach(([dx, dy], i) => {
        line(cx, ground - 5 * scale, cx + dx * scale, ground + dy * scale, i % 2 ? '/' : '\\', 137);
      });
      for (let i = 0; i < 260 * scale; i++) {
        const a = hash(i * 2 + 400) * Math.PI * 2;
        const r = Math.sqrt(hash(i * 2 + 401));
        const x = cx + Math.cos(a) * r * 18 * scale + Math.sin(t * .7 + i) * .3;
        const y = top + Math.sin(a) * r * 6 * scale;
        if (season !== 'winter' || i % 3 === 0) put(x, y, season === 'winter' ? '*' : ['*','+','%','o'][i % 4], p[i % p.length]);
      }
    };
    const snow = (count, inside = false) => {
      const kick = Math.max(0, 1 - (t - (options.shakeTime ?? -100)) / 4);
      for (let i = 0; i < count; i++) {
        const x = (hash(i + 900) * W + Math.sin(t * .7 + i) * (2 + kick * 5) + W) % W;
        const y = (hash(i + 1100) * 32 + t * (1.4 + hash(i) * 2) + kick * hash(i) * 6) % 32;
        if (!inside || ((x - 55) / 28) ** 2 + ((y - 17) / 13) ** 2 < .9) put(x, y, i % 4 ? '.' : '*', 255);
      }
    };
    const season = ['spring', 'summer', 'autumn', 'winter'].includes(options.season) ? options.season : 'spring';

    if (scene === 'tree') {
      stars(35, 0, 20);
      mountains(36, season === 'winter' ? 110 : 60, season === 'winter' ? 255 : 109);
      line(0, 41, W - 1, 41, '_', season === 'winter' ? 255 : 71);
      for (let i = 0; i < 55; i++) {
        const x = hash(i + 2600) * W, y = 38 + hash(i + 2700) * 4;
        put(x, y, season === 'winter' ? '.' : i % 3 ? ',' : 'v', season === 'winter' ? 255 : 71);
      }
      for (let y = 9; y < 26; y++) for (let x = 50; x <= 100; x++) {
        if (((x - 75) / 25) ** 2 + ((y - 17) / 8) ** 2 <= 1) put(x, y, ' ', 0);
      }
      tree(Math.floor(W / 2), 40, 1.35, season);
      if (season === 'winter') snow(110);
      else for (let i = 0; i < 28; i++) {
        const x = 40 + hash(i + 200) * 70 + Math.sin(t + i) * 2;
        const y = 22 + ((hash(i + 201) * 18 + t * .8) % 18);
        put(x, y, season === 'spring' ? '*' : '.', palettes[season][i % 4]);
      }
      text(4, 3, season.toUpperCase() + ' / THE VALLEY', 250);
    } else if (scene === 'snowglobe') {
      stars(25, 0, 30);
      for (let i = 0; i < 340; i++) {
        const a = Math.PI * 2 * i / 340;
        put(55 + 29 * Math.cos(a), 16 + 13 * Math.sin(a), i % 5 ? '.' : '*', 117);
      }
      line(29, 25, 81, 25, '_', 255); tree(54, 24, .48, 'winter');
      text(62, 22, '/\\', 230); text(60, 23, '/__\\', 230); text(60, 24, '|[]|', 180);
      snow(90, true); text(31, 29, '\\________________________________________________/', 110);
      put(35, 30, '|', 110); put(76, 30, '|', 110); text(50, 30, 'WINTER GLOBE', 110);
      text(35, 31, '|________________________________________|', 110);
    } else if (scene === 'aquarium') {
      const water = options.waterColor === 'teal' ? [23, 30, 37, 44] : options.waterColor === 'purple'
        ? [54, 60, 97, 141] : [24, 25, 67, 75];
      const fishColors = options.fishColor === 'coral' ? [203, 209, 214, 216, 215, 209]
        : options.fishColor === 'cool' ? [75, 81, 117, 141, 111, 159] : [214, 211, 220, 81, 209, 225];
      const left = 4, right = W - 5, top = 2, floor = H - 8;
      const tankPut = (x, y, ch, color) => {
        if (x > left && x < right && y > top && y < floor) put(x, y, ch, color);
      };
      const tankText = (x, y, str, color) => [...str].forEach((ch, i) => {
        if (ch !== ' ') tankPut(x + i, y, ch, color);
      });

      // Ripples and small drifting particles give the water depth without filling the scene.
      for (let x = left + 4; x < right - 4; x += 17) {
        tankText(x + Math.sin(t * .5 + x) * 2, top + 2, '~--~', water[2]);
      }
      for (let i = 0; i < 130; i++) {
        const x = left + 3 + hash(i + 1200) * (right - left - 6);
        const y = top + 4 + hash(i + 1400) * (floor - top - 7);
        tankPut(x + Math.sin(t * .3 + i) * .4, y, i % 11 ? '.' : ':', water[i % 2]);
      }
      for (let i = 0; i < 38; i++) {
        const x = 10 + hash(i + 220) * (W - 20) + Math.sin(t * 1.1 + i) * 1.5;
        const y = top + 3 + ((hash(i + 221) * (floor - top - 5) - t * (1.5 + i % 3) + 10000) % (floor - top - 5));
        tankPut(x, y, i % 5 === 0 ? 'O' : i % 2 ? 'o' : '.', water[3]);
      }

      // Layered sand, pebbles, and rocks sit behind the plants and fish.
      for (let x = left + 1; x < right; x++) {
        const dune = floor - 3 - Math.round(Math.sin(x * .045) * 1.2);
        for (let y = dune; y < floor; y++) {
          tankPut(x, y, ['.', ':', ',', '`'][Math.floor(hash(x * 7 + y) * 4)], [101, 137, 144, 180][(x + y) % 4]);
        }
      }
      const rocks = [
        { x: 15, y: floor - 4, lines: ['     _____', '  .-\'     `-.', ' /__..__..___\\'] },
        { x: 109, y: floor - 4, lines: ['   ___    ____', ' /   `-./    \\', '/___..__\\____/'] },
      ];
      rocks.forEach(rock => rock.lines.forEach((row, i) => tankText(rock.x, rock.y + i, row, 102)));
      tankText(72, floor - 8, '     .-._.-.', 180);
      tankText(72, floor - 7, '   _/  _  \\_', 180);
      tankText(72, floor - 6, '  /   / \\   \\', 137);
      tankText(72, floor - 5, ' /___/   \\___\\', 137);

      // Individual fronds sway at different rates rather than moving as one block.
      for (let i = 0; i < 18; i++) {
        const root = 10 + i * 8 + Math.round(hash(i + 90) * 3);
        const height = 7 + Math.floor(hash(i + 91) * 10);
        const color = [28, 34, 71, 77, 114][i % 5];
        for (let j = 0; j < height; j++) {
          const sway = Math.sin(t * .8 + i * 1.7 + j * .28) * j * .09;
          const x = root + sway, y = floor - 3 - j;
          tankPut(x, y, j % 3 === 0 ? '|' : j % 2 ? '/' : '\\', color);
          if (j > 2 && j % 3 === 0) tankPut(x + (j % 2 ? 1 : -1), y, j % 2 ? ')' : '(', color);
        }
      }
      // Coral branches and a small starfish add foreground detail.
      for (const [x, color] of [[35, 203], [128, 209], [146, 141]]) {
        for (let j = 0; j < 5; j++) tankPut(x, floor - 4 - j, '|', color);
        tankText(x - 3, floor - 8, '\\ | /', color);
        tankText(x - 2, floor - 7, '\\|/', color);
      }
      tankText(53, floor - 3, ' * ', 214);
      tankText(53, floor - 2, '*+*', 214);

      // Different silhouettes, directions, and speeds make the fish feel individual.
      const fishShapes = [
        ['       .-~~~~~-.', ' /\\  /         \\', '<  >-(   ))   o  )>', ' \\/  \\         /', '       `-------\''],
        ['       .-^^^^-.', ' /\\ .\'        `.', '<  >- (  / /  o  )>', ' \\/ `._        _.\'', '       `------\''],
        ['      .-~~~~-.', ' /\\ /        \\', '<  >|  ::   o  )>', ' \\/ \\        /', '      `------\''],
      ];
      const mirror = str => [...str].reverse().map(ch => ({ '<': '>', '>': '<', '(': ')', ')': '(', '/': '\\', '\\': '/' })[ch] || ch).join('');
      const shark = [
        '                /\\',
        '  /\\__________/  \\________',
        ' <      ___    )))      o   \\_',
        '  \\/\\_/   \\________     ___/',
        '          \\__/      \\___/',
      ];
      const puffer = [
        '      \\ | /',
        '     .-^^^-.',
        '   -/ o  .  \\ -',
        '    |  .    |><',
        '   -\\  .   / -',
        '     `-vvv-\'',
      ];
      function foregroundFish(x, y, shape, color) {
        const width = Math.max(...shape.map(row => row.length));
        shape.forEach((row, j) => {
          for (let col = 0; col < width; col++) tankPut(x + col, y + j, ' ', 0);
          tankText(x, y + j, row, color);
        });
      }
      const widthOf = shape => Math.max(...shape.map(row => row.length));
      const placements = window.DetailedScenes.aquariumLayout({ left, right, time: t, classic: true,
        fishWidth: Math.max(...fishShapes.map(widthOf)), sharkWidth: widthOf(shark), pufferWidth: widthOf(puffer) });
      for (const placement of placements) {
        const { kind, x, y, index, direction } = placement;
        let shape = kind === 'fish' ? window.DetailedScenes.animateFishTail(fishShapes[index % fishShapes.length], t)
          : kind === 'shark' ? shark : puffer;
        if (kind === 'fish' && direction < 0) {
          const width = widthOf(shape);
          shape = shape.map(row => mirror(row.padEnd(width)));
        }
        foregroundFish(x, y, shape, kind === 'shark' ? 250 : fishColors[index % fishColors.length]);
      }
      line(left, top, right, top, '=', water[3]); line(left, floor, right, floor, '=', water[3]);
      line(left, top, left, floor, '|', water[3]); line(right, top, right, floor, '|', water[3]);
      text(left + 2, top, '[ AQUARIUM ]', water[3]);
    } else if (scene === 'space' || scene === 'earth-night') {
      stars(150, 0, 44);
      const cx = 75, cy = 24, rx = 38, ry = 19;
      const land = window.EARTH_LAND_MASK;
      // Orthographic projection: each visible cell maps back to longitude and latitude.
      for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
        const nx = x / rx, ny = y / ry, d = nx * nx + ny * ny;
        if (d <= 1) {
          const z = Math.sqrt(Math.max(0, 1 - d));
          const latitude = Math.asin(-ny);
          const longitude = Math.atan2(nx, z) - Math.PI / 2 + t * .18;
          const wrapped = ((longitude + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
          const col = Math.min(179, Math.floor(wrapped / (2 * Math.PI) * 180));
          const row = Math.min(89, Math.max(0, Math.floor((Math.PI / 2 - latitude) / Math.PI * 90)));
          const isLand = land && land[row][col] === '1';
          const polar = Math.abs(latitude) > 1.33;
          const ice = polar && isLand;
          const ch = ice ? '#' : isLand ? (d > .72 ? '*' : '%') : (d > .8 ? ':' : '+');
          const color = ice ? 255 : isLand ? (d > .65 ? 71 : 114) : (d > .7 ? 24 : 75);
          if (scene === 'earth-night') {
            const lights = window.EARTH_NIGHT_LIGHTS;
            const lightRow = Math.min(359, Math.max(0, Math.floor((Math.PI / 2 - latitude) / Math.PI * 360)));
            const lightCol = Math.min(719, Math.floor(wrapped / (2 * Math.PI) * 720));
            const brightness = lights ? Number(lights[lightRow][lightCol]) : 0;
            put(cx + x, cy + y, brightness ? (brightness > 3 ? '*' : '+') : isLand ? ':' : '.',
              brightness ? (brightness > 3 ? 230 : 178) : ice ? 250 : isLand ? 60 : 24);
          } else put(cx + x, cy + y, ch, color);
        }
      }
      const a = t * .25 + 1.2;
      text(cx + 55 * Math.cos(a), cy + 20 * Math.sin(a), '(o)', 250);
      text(Math.floor((t * 4) % 180) - 20, 5, '<===>', 220);
      text(4, 3, scene === 'earth-night' ? 'EARTH AT NIGHT / NASA 2016' : 'EARTH / ROTATING GLOBE', 250);
    } else if (scene === 'solar') {
      stars(150, 0, 44);
      const cx = 74, cy = 24;
      // Orbit radii and speeds are stylized for readability, not astronomical scale.
      const planets = [
        ['Mercury', 10, 3, 1.55, 250, '.'], ['Venus', 16, 5, 1.15, 222, 'o'],
        ['Earth', 22, 7, .85, 81, 'O'], ['Mars', 29, 9, .64, 203, 'o'],
        ['Jupiter', 37, 11, .42, 215, '@'], ['Saturn', 45, 13, .31, 229, 'O'],
        ['Uranus', 54, 16, .22, 117, 'o'], ['Neptune', 65, 19, .16, 75, 'o'],
      ];
      for (const [, rx, ry] of planets) for (let i = 0; i < 100; i++) {
        const a = i * Math.PI * 2 / 100;
        if (i % 3 === 0) put(cx + rx * Math.cos(a), cy + ry * Math.sin(a), '.', 238);
      }
      text(cx - 3, cy - 1, ' \ | /', 214);
      text(cx - 3, cy, '-- @ --', 226);
      text(cx - 3, cy + 1, ' / | \\', 214);
      planets.forEach(([name, rx, ry, speed, color, char], i) => {
        const a = t * speed * .16 + i * 1.7;
        const x = Math.round(cx + rx * Math.cos(a)), y = Math.round(cy + ry * Math.sin(a));
        put(x, y, char, color);
        if (name === 'Saturn') { put(x - 1, y, '-', color); put(x + 1, y, '-', color); }
      });
      text(3, 2, 'SOLAR SYSTEM / ORBITS NOT TO SCALE', 250);
      text(3, 46, 'Mercury  Venus  Earth  Mars  Jupiter  Saturn  Uranus  Neptune', 250);
    } else if (scene === 'ocean') {
      const night = options.oceanTime === 'night';
      stars(night ? 100 : 10, 0, 25);
      if (night) moon(125, 4);
      else {
        text(125, 7, '   \ | /', 220); text(125, 8, ' --  @  --', 214); text(125, 9, '   / | \\', 220);
      }
      for (let y = 27; y < 45; y++) for (let x = 0; x < W; x += 3) {
        put(x + Math.sin(t * 1.2 + y * .7) * 2, y, y % 3 ? '~' : '-', y % 2 ? 74 : 81);
      }
      // A lighthouse, sailboat, and moving animals create a complete coastal scene.
      text(12, 11, '     /\\', 255); text(12, 12, '    /__\\', 255);
      text(12, 13, '   | *  |', 220); text(12, 14, '   |____|', 255);
      for (let y = 15; y <= 29; y++) text(12, y, y % 4 ? '    |  |' : '    |==|', 255);
      text(10, 30, '___/____\\___', 244);
      const bx = 62 + Math.sin(t * .4) * 5, by = 27 + Math.sin(t * .8) * .5;
      line(bx, by - 12, bx, by, '|', 231); line(bx + 1, by - 11, bx + 15, by - 2, '/', 230);
      text(bx - 11, by, '\\________________________/', 180); text(bx - 8, by + 1, '\\____________________/', 180);
      const jump = t % 11;
      if (jump < 5) {
        const dx = 101 + jump * 6, dy = 26 - Math.sin(jump / 5 * Math.PI) * 8;
        text(dx, dy, '  __', 117); text(dx, dy + 1, ' /o `-.__', 117);
        text(dx, dy + 2, '<__      )~', 117); text(dx, dy + 3, '   `----\'', 117);
      }
      const wx = 92 + Math.sin(t * .25) * 5;
      for (let y = 37; y <= 42; y++) for (let x = Math.round(wx); x < wx + 23; x++) put(x, y, ' ', 0);
      text(wx, 37, '        .', 117); text(wx, 38, '      . | .', 117);
      text(wx, 39, '   ___\\|/___', 117); text(wx, 40, ' _/  o       `-.__', 117);
      text(wx, 41, '<_                _)>', 117); text(wx, 42, '  `--._________.-\'', 117);
    } else if (scene === 'rain') {
      stars(15, 0, 12);
      mountains(36, 67, 109);
      for (let i = 0; i < 20; i++) {
        const x = 2 + i * 8, h = 3 + Math.floor(hash(i + 3000) * 5);
        for (let y = 0; y < h; y++) text(x - y, 40 - h + y, '/'.repeat(y) + '|' + '\\'.repeat(y), 28);
        put(x, 41, '|', 137);
      }
      for (let i = 0; i < 190; i++) {
        const x = (hash(i + 500) * W + t * 3 + W) % W;
        const y = (hash(i + 501) * 43 + t * 9) % 43;
        put(x, y, '/', 67);
      }
      if (Math.sin(t * .23) > .985) {
        text(105, 3, '    /', 231); text(105, 4, '   /_', 231); text(105, 5, '    /', 231); text(105, 6, '   /', 231);
      }
      line(0, 42, W - 1, 42, '_', 67);
      text(4, 3, 'MOUNTAIN RAINSTORM', 250);
    } else if (scene === 'fireworks') {
      stars(90, 0, 30);
      const colors = palettes[options.fireworkColor] || palettes.rainbow;
      for (let b = 0; b < 6; b++) {
        const phase = (t + b * 1.7) % 8, x = 12 + hash(b + 700) * (W - 24), y = 4 + hash(b + 701) * 12;
        if (phase < 1.5) { put(x, 40 - phase / 1.5 * (40 - y), '|', 229); }
        else if (phase < 5) {
          const radius = (phase - 1.5) * 3.5;
          for (let i = 0; i < 36; i++) {
            const a = i * Math.PI * 2 / 36, r = radius * (.75 + hash(i + b * 40) * .3);
            put(x + Math.cos(a) * r * 2, y + Math.sin(a) * r + (phase - 1.5) ** 2 * .2, phase > 4 ? '.' : i % 3 ? '*' : '+', colors[(i + b) % colors.length]);
          }
        }
      }
      newYorkSkyline(40);
      text(4, 46, 'NEW YORK CITY / RAINBOW FIREWORKS', 250);
    } else if (scene === 'nightsky') {
      stars(190, 0, 33); moon(122, 5);
      mountains(40, 60, 110);
      for (let i = 0; i < 18; i++) {
        const x = i * 9 + 2, h = 2 + Math.floor(hash(i + 3500) * 5);
        for (let y = 0; y < h; y++) text(x - y, 44 - h + y, '/'.repeat(y) + '|' + '\\'.repeat(y), 29);
      }
      const phase = t % 9;
      if (phase < 1.8) text(8 + phase * 38, 4 + phase * 6, '---*', 231);
      line(0, 44, W - 1, 44, '_', 239);
      line(4, 3, 24, 3, ' ', 0);
      text(4, 3, 'NIGHT SKY / MOUNTAINS', 250);
    }

    // Preserve each scene's proportions while expanding it onto the shared 300×90 grid.
    const output = dimensions(scene);
    const enlarged = Array.from({ length: output.height }, (_, y) =>
      Array.from({ length: output.width }, (_, x) => rows[Math.floor(y * H / output.height)][Math.floor(x * W / output.width)]));
    const putFine = (x, y, ch, color, onlyBlank = false) => {
      x = Math.round(x); y = Math.round(y);
      if (x >= 0 && x < output.width && y >= 0 && y < output.height && (!onlyBlank || enlarged[y][x][0] === ' ')) {
        enlarged[y][x] = [ch, color];
      }
    };
    // Add independent fine particles, so the larger grid adds detail beyond enlarged outlines.
    if (['space', 'earth-night', 'solar', 'fireworks', 'nightsky'].includes(scene)) {
      for (let i = 0; i < 90; i++) putFine(hash(i + 4100) * output.width, hash(i + 4200) * 65,
        Math.sin(t * 1.3 + i) > .9 ? '*' : '.', i % 4 ? 244 : 229, true);
    } else if (scene === 'rain' || (scene === 'tree' && season === 'winter')) {
      for (let i = 0; i < 100; i++) {
        const x = (hash(i + 4300) * output.width + t * (scene === 'rain' ? 4 : 1)) % output.width;
        const y = (hash(i + 4400) * 80 + t * (scene === 'rain' ? 12 : 3)) % 80;
        putFine(x, y, scene === 'rain' ? '/' : '.', scene === 'rain' ? 67 : 255, true);
      }
    } else if (scene === 'aquarium') {
      for (let i = 0; i < 35; i++) {
        const x = 15 + hash(i + 4500) * 270 + Math.sin(t + i);
        const y = 8 + ((hash(i + 4600) * 65 - t * (2 + i % 3) + 10000) % 65);
        putFine(x, y, i % 3 ? '.' : 'o', options.waterColor === 'teal' ? 44 : options.waterColor === 'purple' ? 141 : 75, true);
      }
    }
    for (const label of labels) {
      const x = Math.round(label.x * output.width / W), y = Math.round(label.y * output.height / H);
      Array.from(label.str).forEach((ch, i) => putFine(x + i, y, ch, label.color));
    }
    const message = Array.from(options.message || '').slice(0, output.width);
    const start = Math.max(0, Math.floor((output.width - message.length) / 2));
    message.forEach((ch, i) => putFine(start + i, output.height - 2, ch, 218));
    return '\x1b[H' + enlarged.map(row => {
      let last = -1, out = '';
      for (const [char, color] of row) {
        if (char !== ' ' && color !== last) { out += `\x1b[38;5;${color}m`; last = color; }
        out += char;
      }
      return out;
    }).join('\n') + '\x1b[0m';
  }
  window.AsciiScenes = { render, width: W, height: H, dimensions };
})();
