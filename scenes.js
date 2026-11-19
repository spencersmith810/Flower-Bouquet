/* Character-grid animations. All scenes return the same ANSI format as bouquet3d.py. */
(function () {
  const W = 110, H = 38;
  const dimensions = scene => scene === 'aquarium' ? { width: 164, height: 52 } : { width: W, height: H };
  const palettes = {
    spring: [218, 225, 211, 114], summer: [34, 71, 77, 114],
    autumn: [130, 166, 172, 214], winter: [250, 254, 231, 117],
    warm: [196, 208, 220, 211, 231], cool: [39, 45, 141, 213, 231],
    rainbow: [196, 208, 226, 46, 45, 141, 213],
  };

  function render(scene, options) {
    const { width: W, height: H } = dimensions(scene);
    const t = options.time || 0;
    const rows = Array.from({ length: H }, () => Array.from({ length: W }, () => [' ', 0]));
    const put = (x, y, char, color = 255) => {
      x = Math.round(x); y = Math.round(y);
      if (x >= 0 && x < W && y >= 0 && y < H) rows[y][x] = [char, color];
    };
    const text = (x, y, str, color = 255) => [...str].forEach((ch, i) => { if (ch !== ' ') put(x + i, y, ch, color); });
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
    const skyline = (y, color = 244) => {
      for (let i = 0; i < 14; i++) {
        const x = i * 8, h = 2 + Math.floor(hash(i + 150) * 6);
        line(x, y, x, y - h, '|', color); line(x, y - h, x + 6, y - h, '_', color);
        line(x + 6, y - h, x + 6, y, '|', color);
        for (let wy = y - h + 2; wy < y; wy += 2) for (let wx = x + 2; wx < x + 6; wx += 2) put(wx, wy, '.', 221);
      }
      line(0, y + 1, W - 1, y + 1, '_', color);
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
      stars(45, 0, 18); line(0, 32, W - 1, 32, '_', season === 'winter' ? 255 : 71);
      tree(55, 31, 1, season);
      if (season === 'winter') snow(70);
      else for (let i = 0; i < 12; i++) put(30 + hash(i + 200) * 50, 23 + (hash(i + 201) * 9 + t * .5) % 9, '.', palettes[season][i % 4]);
      text(47, 2, season.toUpperCase() + ' TREE', 250);
    } else if (scene === 'snowglobe') {
      stars(25, 0, 30);
      for (let i = 0; i < 340; i++) {
        const a = Math.PI * 2 * i / 340;
        put(55 + 29 * Math.cos(a), 16 + 13 * Math.sin(a), i % 5 ? '.' : '*', 117);
      }
      line(29, 25, 81, 25, '_', 255); tree(54, 24, .48, 'winter');
      text(62, 22, '/\\', 230); text(60, 23, '/__\\', 230); text(60, 24, '|[]|', 180);
      snow(90, true); text(31, 29, '\\________________________________________________/', 110);
      text(35, 30, '|              WINTER GLOBE              |', 110);
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
        ['       .-~~~~-.', '   ___/  _     \\', '><(_____(o)  ~~~ )>', '   \\   `-.___.-\'/', '    `--.___..--\''],
        ['      _.-~~~-._', '  _.-\'  _     `-._', '<(_____(o)  ///  _)>', '  `-._        _.-\'', '      `-.__.-\''],
        ['      .-^^^-._', '  ___/  o     `-._', '><___   ))))     _)>', '     \\__    _.-\'', '        `---\''],
      ];
      const mirror = str => [...str].reverse().map(ch => ({ '<': '>', '>': '<', '(': ')', ')': '(', '/': '\\', '\\': '/' })[ch] || ch).join('');
      for (let i = 0; i < 6; i++) {
        const shape = fishShapes[i % fishShapes.length];
        const shapeWidth = Math.max(...shape.map(row => row.length));
        const range = right - left + shapeWidth;
        const motion = (t * (3.2 + i * .43) + i * 27) % range;
        const x = i % 2 ? right - motion : left - shapeWidth + motion;
        const y = 7 + (i % 3) * 9 + (i >= 3 ? 3 : 0) + Math.sin(t * .8 + i) * 1.2;
        shape.forEach((row, j) => tankText(x, y + j, i % 2 ? mirror(row.padEnd(shapeWidth)) : row, fishColors[i]));
      }
      for (let i = 0; i < 38; i++) {
        const x = 10 + hash(i + 220) * (W - 20) + Math.sin(t * 1.1 + i) * 1.5;
        const y = top + 3 + ((hash(i + 221) * (floor - top - 5) - t * (1.5 + i % 3) + 10000) % (floor - top - 5));
        tankPut(x, y, i % 5 === 0 ? 'O' : i % 2 ? 'o' : '.', water[3]);
      }
      line(left, top, right, top, '=', water[3]); line(left, floor, right, floor, '=', water[3]);
      line(left, top, left, floor, '|', water[3]); line(right, top, right, floor, '|', water[3]);
      text(left + 2, top, '[ AQUARIUM ]', water[3]);
    } else if (scene === 'space') {
      stars(120, 0, 32);
      const cx = 55, cy = 18, rx = 20, ry = 10;
      for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
        const d = (x / rx) ** 2 + (y / ry) ** 2;
        if (d <= 1) {
          const terrain = Math.sin(x * .35 + t * .7) + Math.cos(y * .9 + x * .16);
          put(cx + x, cy + y, d > .88 ? '.' : terrain > .5 ? '%' : terrain > -.4 ? '+' : ':', terrain > .5 ? 114 : 75);
        }
      }
      for (let i = 0; i < 80; i++) { const a = i * Math.PI * 2 / 80; put(cx + 29 * Math.cos(a), cy + 6 * Math.sin(a), '.', 244); }
      const a = t * .45; put(cx + 29 * Math.cos(a), cy + 6 * Math.sin(a), 'o', 231);
      const b = -t * .27 + 2; put(cx + 33 * Math.cos(b), cy + 8 * Math.sin(b), '*', 250);
      text(Math.floor((t * 5) % 130) - 15, 5, '<===>', 220);
    } else if (scene === 'ocean') {
      stars(options.oceanTime === 'night' ? 70 : 12, 0, 18);
      if (options.oceanTime === 'night') moon(82, 4);
      else { text(82, 5, ' \ | / ', 220); text(82, 6, '-- @ --', 214); text(82, 7, ' / | \\', 220); }
      for (let y = 21; y < 33; y++) for (let x = 0; x < W; x += 3) put(x + Math.sin(t * 1.2 + y) * 2, y, y % 3 ? '~' : '-', y % 2 ? 74 : 81);
      text(14, 10, '  /\\  ', 255); text(14, 11, ' /__\\ ', 255); text(14, 12, ' |**| ', 220);
      for (let y = 13; y <= 22; y++) text(14, y, y % 3 ? ' |  | ' : ' |==| ', 255);
      text(12, 23, '__|__|__', 244);
      const bx = 58 + Math.sin(t * .5) * 8, by = 21 + Math.sin(t) * .5;
      line(bx, by - 9, bx, by, '|', 231); line(bx + 1, by - 8, bx + 10, by - 1, '/', 230);
      text(bx - 9, by, '\\__________________/', 180); text(bx - 7, by + 1, '\\________________/', 180);
    } else if (scene === 'rain') {
      stars(15, 0, 10); skyline(28, 244);
      for (let i = 0; i < 110; i++) {
        const x = (hash(i + 500) * W + t * 3 + W) % W;
        const y = (hash(i + 501) * 31 + t * 9) % 32;
        put(x, y, '/', 67);
      }
      if (Math.sin(t * .23) > .985) { text(71, 3, '  /', 231); text(71, 4, ' /_', 231); text(71, 5, '  /', 231); }
      line(2, 1, W - 3, 1, '=', 109); line(2, 33, W - 3, 33, '=', 109);
      line(2, 1, 2, 33, '|', 109); line(W - 3, 1, W - 3, 33, '|', 109);
    } else if (scene === 'fireworks') {
      stars(70, 0, 26); skyline(31, 245);
      const colors = palettes[options.fireworkColor] || palettes.rainbow;
      for (let b = 0; b < 6; b++) {
        const phase = (t + b * 1.7) % 8, x = 15 + hash(b + 700) * 80, y = 5 + hash(b + 701) * 11;
        if (phase < 1.5) { put(x, 30 - phase / 1.5 * (30 - y), '|', 229); }
        else if (phase < 5) {
          const radius = (phase - 1.5) * 3.5;
          for (let i = 0; i < 36; i++) {
            const a = i * Math.PI * 2 / 36, r = radius * (.75 + hash(i + b * 40) * .3);
            put(x + Math.cos(a) * r * 2, y + Math.sin(a) * r + (phase - 1.5) ** 2 * .2, phase > 4 ? '.' : i % 3 ? '*' : '+', colors[(i + b) % colors.length]);
          }
        }
      }
    } else if (scene === 'nightsky') {
      stars(170, 0, 32); moon(81, 4);
      text(12 + Math.round(Math.sin(t * .12) * 8), 8, '    .--.     .--. ', 246);
      text(12 + Math.round(Math.sin(t * .12) * 8), 9, ' .-(    )---(    )-.', 246);
      const phase = t % 9;
      if (phase < 1.8) text(8 + phase * 28, 4 + phase * 6, '---*', 231);
      line(0, 33, W - 1, 33, '_', 239);
    }

    const message = Array.from(options.message || '');
    const start = Math.max(0, Math.floor((W - message.length) / 2));
    message.slice(0, W).forEach((ch, i) => put(start + i, H - 2, ch, 218));
    return '\x1b[H' + rows.map(row => {
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
