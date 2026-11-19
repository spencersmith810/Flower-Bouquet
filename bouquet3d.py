import math
import os
import random
import shutil
import sys
import time

if os.name != "nt":
    import select
    import termios
    import tty

FPS = 24
SPIN_SPEED = 0.6
TILT = 0.30
CAM_DIST = 4.0
MESSAGE = "for you ♥"
NUM_HEARTS = 18

WHITE = [244, 248, 251, 254, 255, 231]
PINK = [125, 162, 168, 205, 211, 218, 225]
RED = [52, 88, 124, 160, 196, 203]
PURPLE = [54, 91, 97, 134, 140, 183]
YELLOW = [136, 178, 214, 220, 226, 229]
ORANGE = [130, 166, 202, 208, 214, 216]
GOLD_CENTER = [94, 136, 178, 214, 220]
DARK_CENTER = [52, 58, 94, 130, 136]
GREENS = [22, 28, 28, 34, 35, 71, 77, 114]
PAPER = [101, 144, 187, 223, 230, 231]
RIBBON = [88, 125, 161, 197, 204, 211]
HEART_COLORS = [161, 197, 204, 205, 211, 218]
MSG_COLORS = [161, 168, 205, 211, 218, 225, 218, 211, 205, 168]
SHADE = ".:-=+*%@"
PETAL_SHADE = "+*#%"
RESET = "\033[0m"
PIVOT_Y = 0.2

_L = (-0.45, 0.6, 0.66)
_n = math.sqrt(sum(v * v for v in _L))
LX, LY, LZ = (v / _n for v in _L)

DISC_TYPES = [
    (WHITE, GOLD_CENTER, 13),
    (PINK, GOLD_CENTER, 8),
    (RED, DARK_CENTER, 6),
    (PURPLE, GOLD_CENTER, 7),
    (YELLOW, DARK_CENTER, 12),
    (ORANGE, DARK_CENTER, 9),
]
TULIP_COLORS = [RED, PINK, YELLOW]

COLOR_THEMES = [
    {"name": "Original", "flowers": None, "centers": None, "greens": None,
     "paper": None, "ribbon": None, "hearts": None, "message": None,
     "white": None},
    {"name": "Romantic", "flowers": [161, 168, 197, 205, 211, 218],
     "centers": [94, 136, 178, 220], "greens": [22, 28, 34, 71, 114],
     "paper": [224, 230, 231, 255], "ribbon": [125, 161, 197, 211],
     "hearts": [161, 197, 204, 211, 218], "message": [161, 168, 205, 211, 218],
     "white": [231, 244, 248, 255]},
    {"name": "Sunset", "flowers": [124, 130, 166, 202, 208, 214, 216],
     "centers": [94, 130, 178, 220], "greens": [22, 28, 34, 58, 94],
     "paper": [223, 230, 231, 255], "ribbon": [124, 130, 166, 202],
     "hearts": [124, 160, 196, 202, 208], "message": [130, 166, 202, 208, 214],
     "white": [230, 231, 244, 255]},
    {"name": "Lavender Garden", "flowers": [54, 91, 97, 134, 140, 183, 197, 205],
     "centers": [94, 136, 178, 220], "greens": [22, 28, 34, 71, 114],
     "paper": [189, 231, 255], "ribbon": [54, 91, 134, 183],
     "hearts": [91, 97, 134, 140, 183], "message": [91, 134, 183, 197, 205],
     "white": [189, 231, 244, 255]},
    {"name": "Spring", "flowers": [40, 82, 118, 154, 190, 220, 226],
     "centers": [94, 136, 178, 220], "greens": [22, 28, 34, 35, 71, 114],
     "paper": [159, 194, 230, 255], "ribbon": [40, 82, 118, 154],
     "hearts": [118, 154, 190, 220], "message": [40, 82, 118, 154, 190],
     "white": [194, 230, 244, 255]},
    {"name": "Midnight", "flowers": [33, 39, 54, 90, 99, 129, 165, 201],
     "centers": [39, 54, 99, 201], "greens": [17, 18, 23, 24, 30, 60],
     "paper": [60, 66, 102, 145], "ribbon": [33, 39, 54, 90],
     "hearts": [90, 99, 129, 165, 201], "message": [90, 99, 129, 165, 201],
     "white": [145, 153, 189, 231]},
    {"name": "Monochrome", "flowers": [239, 245, 250, 255],
     "centers": [236, 242, 248, 255], "greens": [59, 67, 102, 145],
     "paper": [145, 188, 231, 255], "ribbon": [59, 67, 102, 145],
     "hearts": [145, 188, 231, 255], "message": [145, 188, 231, 255],
     "white": [188, 231, 245, 255]},
]

BOUQUET_PRESETS = [
    {"count": 10, "types": ["disc", "disc", "tulip"], "distance": 0.64, "size": (0.12, 0.14)},
    {"count": 9, "types": ["disc", "tulip", "tulip", "disc"], "distance": 0.61, "size": (0.13, 0.16)},
    {"count": 8, "types": ["disc", "disc", "tulip"], "distance": 0.68, "size": (0.14, 0.18)},
    {"count": 12, "types": ["disc", "disc", "disc", "tulip"], "distance": 0.58, "size": (0.10, 0.13)},
    {"count": 14, "types": ["disc", "tulip", "disc"], "distance": 0.55, "size": (0.09, 0.13)},
    {"count": 7, "types": ["disc", "tulip"], "distance": 0.70, "size": (0.15, 0.19)},
    {"count": 11, "types": ["disc", "disc", "tulip"], "distance": 0.62, "size": (0.11, 0.15)},
]


def norm(v):
    m = math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2) or 1.0
    return (v[0] / m, v[1] / m, v[2] / m)


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def basis(axis):
    helper = (0.0, 1.0, 0.0) if abs(axis[1]) < 0.9 else (1.0, 0.0, 0.0)
    u = norm(cross(helper, axis))
    return u, cross(axis, u)


def add(p, d, k):
    return (p[0] + d[0] * k, p[1] + d[1] * k, p[2] + d[2] * k)


def build_scene(variant=0):
    preset = BOUQUET_PRESETS[variant % len(BOUQUET_PRESETS)]
    rnd = random.Random(21 + variant * 17)
    pts = []
    neck = (0.0, -0.12, 0.0)

    C, D = (0.0, 0.12, 0.0), 0.64
    N = preset["count"]
    golden = math.pi * (3 - math.sqrt(5))
    heads = []
    for i in range(N):
        el = math.radians(88 - 60 * math.sqrt(i / (N - 1)))
        az = i * golden
        d = (math.cos(el) * math.cos(az), math.sin(el), math.cos(el) * math.sin(az))
        pos = add(C, d, preset["distance"] * rnd.uniform(0.92, 1.05))
        heads.append((pos, norm(d)))

    flowers = []
    disc_i = 0
    for idx, (pos, axis) in enumerate(heads):
        base = add(pos, axis, -0.03)
        for j in range(70):
            t = j / 69
            p = (base[0] + (neck[0] - base[0]) * t, base[1] + (neck[1] - base[1]) * t,
                 base[2] + (neck[2] - base[2]) * t)
            pts.append((p[0], p[1], p[2], axis[0], 0.0, axis[2], GREENS, -0.15, True, None))

        kind = preset["types"][idx % len(preset["types"])]
        if kind == "tulip":
            n_t = sum(1 for previous in range(idx)
                      if preset["types"][previous % len(preset["types"])] == "tulip")
            flowers.append((pos, "tulip", TULIP_COLORS[n_t % len(TULIP_COLORS)], None, 0,
                            rnd.uniform(*preset["size"]) * 0.9, rnd.uniform(0, 6.28)))
        else:
            petals, center, n_pet = DISC_TYPES[disc_i % len(DISC_TYPES)]
            disc_i += 1
            flowers.append((pos, "disc", petals, center, n_pet,
                            rnd.uniform(*preset["size"]), rnd.uniform(0, 6.28)))

    for i in range(8):
        a = (i + 0.4) / 8 * 2 * math.pi
        c, s = math.cos(a), math.sin(a)
        base = (0.26 * c, 0.30, 0.26 * s)
        d = norm((c, 0.15, s))
        side = (-s, 0.0, c)
        n = norm(cross(side, d))
        L, W = 0.30, 0.07
        for ti in range(32):
            t = ti / 31
            for wi in range(-5, 6):
                w = wi / 5
                curl = 0.025 * w * w
                p = (base[0] + d[0] * L * t + side[0] * W * math.sin(math.pi * t) * w + n[0] * curl,
                     base[1] + d[1] * L * t - 0.10 * t * t + n[1] * curl,
                     base[2] + d[2] * L * t + side[2] * W * math.sin(math.pi * t) * w + n[2] * curl)
                rib = -0.25 if wi == 0 else 0.0
                pts.append((p[0], p[1], p[2], n[0], n[1], n[2], GREENS, rib, True, None))

    y0, y1, r0, r1 = -0.20, 0.30, 0.06, 0.36
    k = (r1 - r0) / (y1 - y0)
    rings = 50
    for i in range(rings):
        t = i / (rings - 1)
        r = r0 + (r1 - r0) * t
        count = max(8, int(170 * r))
        for j in range(count):
            ph = (j + rnd.random()) / count * 2 * math.pi
            c, s = math.cos(ph), math.sin(ph)
            y = y0 + (y1 - y0) * t
            if t > 0.9:
                y += 0.03 * math.sin(9 * ph)
            fold = 0.3 * (abs(math.sin(5 * ph)) - 0.6)
            nn = norm((c, -k, s))
            pts.append((r * c, y, r * s, nn[0], nn[1], nn[2], PAPER, fold, False, None))

    for i in range(7):
        a = i / 7 * 2 * math.pi
        sx, sz = 0.025 * math.cos(a), 0.025 * math.sin(a)
        for j in range(40):
            t = j / 39
            pts.append((sx * (1 + 1.2 * t), -0.20 - 0.30 * t, sz * (1 + 1.2 * t),
                        math.cos(a), 0.0, math.sin(a), GREENS, -0.1, True, None))

    by = -0.12
    br = r0 + k * (by - y0) + 0.01
    for j in range(90):
        ph = j / 90 * 2 * math.pi
        for dy in (-0.012, 0.0, 0.012):
            pts.append((br * math.cos(ph), by + dy, br * math.sin(ph),
                        math.cos(ph), 0.0, math.sin(ph), RIBBON, 0.0, False, None))
    knot = (0.0, by, br + 0.01)
    for side in (-1, 1):
        for j in range(70):
            a = j / 70 * 2 * math.pi
            lx = side * (0.07 + 0.07 * math.cos(a))
            ly = 0.04 * math.sin(a) + 0.02 * (0.07 + 0.07 * math.cos(a)) / 0.14
            for fill in (1.0, 0.7):
                pts.append((knot[0] + lx * fill, knot[1] + ly * fill, knot[2] + 0.01,
                            side * 0.3, 0.2, 0.93, RIBBON, 0.1, True, None))
        for j in range(30):
            t = j / 29
            pts.append((knot[0] + side * 0.06 * t, knot[1] - 0.15 * t, knot[2] + 0.015,
                        side * 0.2, 0.0, 0.98, RIBBON, -0.05 + 0.05 * math.sin(t * 9), True, None))
    for dx in (-0.01, 0.0, 0.01):
        pts.append((dx, by, knot[2] + 0.02, 0, 0, 1, RIBBON, 0.2, True, "@"))

    babies = []
    for _ in range(90):
        a = rnd.random() * 2 * math.pi
        el = rnd.uniform(0.3, 1.4)
        rr = rnd.uniform(0.40, 0.58)
        babies.append((rr * math.cos(a) * math.cos(el), C[1] + rr * math.sin(el),
                       rr * math.sin(a) * math.cos(el), rnd.uniform(0, 6.28)))

    sparkles = []
    for _ in range(30):
        a = rnd.random() * 2 * math.pi
        rr = rnd.uniform(0.75, 0.95)
        sparkles.append((rr * math.cos(a), rnd.uniform(-0.3, 1.0), rr * math.sin(a),
                         rnd.uniform(0, 6.28), rnd.uniform(1.5, 4.0)))

    return pts, flowers, babies, sparkles


def update_hearts(hearts, dt):
    while len(hearts) < NUM_HEARTS:
        hearts.append([random.random(), 1.0 + random.random(), random.uniform(0.03, 0.08),
                       random.uniform(0, 6.28), random.randrange(len(HEART_COLORS))])
    for h in hearts:
        h[1] -= h[2] * dt
        if h[1] < 0:
            h[0], h[1], h[4] = random.random(), 1.0, random.randrange(len(HEART_COLORS))


def render(scene, t, cols, rows, hearts, speed=SPIN_SPEED, color_mode=0,
           exit_progress=0.0, hint="P: pause  +/-: speed  C: colors  H: hearts  Q: quit"):
    pts, flowers, babies, sparkles = scene
    chars = [[" "] * cols for _ in range(rows)]
    colors = [[0] * cols for _ in range(rows)]
    zbuf = [[-1e9] * cols for _ in range(rows)]

    view_rows = rows - 2
    scale = max(1.0, min((view_rows - 2) / 1.45, (cols - 2) / 2.7))
    sx_scale = scale * 2.0
    cx = cols / 2
    cy = 1 + 0.78 * scale

    ang = t * speed
    ca, sa = math.cos(ang), math.sin(ang)
    ct, st = math.cos(TILT), math.sin(TILT)
    bloom = min(1.0, t / 2.0)
    motion_scale = max(0.05, bloom * (1.0 - exit_progress))
    theme = COLOR_THEMES[color_mode % len(COLOR_THEMES)]

    def palette_color(pal, index):
        if pal is GREENS:
            group = "greens"
        elif pal is PAPER:
            group = "paper"
        elif pal is RIBBON:
            group = "ribbon"
        elif pal is GOLD_CENTER or pal is DARK_CENTER:
            group = "centers"
        elif pal is HEART_COLORS:
            group = "hearts"
        elif pal is MSG_COLORS:
            group = "message"
        elif pal is WHITE:
            group = "white"
        else:
            group = "flowers"
        colors = theme[group]
        if colors is None:
            return pal[index % len(pal)]
        return colors[min(len(colors) - 1, int(index * len(colors) / len(pal)))]

    def animate_position(x, y, z):
        height = max(0.0, y + 0.4)
        gust = max(0.0, math.sin(t * 0.45)) ** 8
        sway = 0.035 * math.sin(t * 1.4) + 0.11 * gust * math.sin(t * 2.0)
        x += sway * height
        z += (0.02 * math.sin(t * 1.4 + 1.5) + 0.05 * gust) * height
        y += 0.018 * math.sin(t * 1.8) * height
        x *= motion_scale
        z *= motion_scale
        y = PIVOT_Y + (y - PIVOT_Y) * motion_scale
        return x, y, z

    def project(x, y, z):
        x, y, z = animate_position(x, y, z)
        xr = x * ca - z * sa
        zr = x * sa + z * ca
        yp = y - PIVOT_Y
        yt = yp * ct - zr * st
        zt = yp * st + zr * ct
        f = CAM_DIST / (CAM_DIST - zt)
        return int(cx + xr * f * sx_scale), int(cy - yt * f * scale), zt

    def project_f(x, y, z):
        x, y, z = animate_position(x, y, z)
        xr = x * ca - z * sa
        zr = x * sa + z * ca
        yp = y - PIVOT_Y
        yt = yp * ct - zr * st
        zt = yp * st + zr * ct
        f = CAM_DIST / (CAM_DIST - zt)
        return cx + xr * f * sx_scale, cy - yt * f * scale, zt, f

    def plot(col, row, z, ch, color):
        if 0 <= row < view_rows and 0 <= col < cols and z > zbuf[row][col]:
            zbuf[row][col] = z
            chars[row][col] = ch
            colors[row][col] = color

    for x, y, _, phase, color in hearts:
        drift = 0.025 * math.sin(t * 1.5 + phase)
        col = int((x + drift) * cols) % cols
        plot(col, int(y * view_rows), -50, "♥", palette_color(HEART_COLORS, color))

    for x, y, z, nx, ny, nz, pal, tone, two_sided, override in pts:
        col, row, zt = project(x, y, z)
        nxr = nx * ca - nz * sa
        nzr = nx * sa + nz * ca
        nyt = ny * ct - nzr * st
        nzt = ny * st + nzr * ct
        dot = nxr * LX + nyt * LY + nzt * LZ
        if two_sided and dot < 0:
            dot = -dot * 0.55
        b = 0.25 + 0.75 * max(0.0, dot) + tone
        b = min(0.999, max(0.0, b))
        if override == "P":
            ch = PETAL_SHADE[int(b * len(PETAL_SHADE))]
        else:
            ch = override or SHADE[int(b * len(SHADE))]
        plot(col, row, zt, ch, palette_color(pal, int(b * len(pal))))

    for (x, y, z), kind, pal, cpal, n_pet, R, seed in flowers:
        flower_speed = 1.0 + 0.18 * math.sin(seed)
        flower_sway = 0.018 * math.sin(t * flower_speed + seed)
        fx, fy, zt, f = project_f(x + flower_sway, y, z + flower_sway * 0.45)
        pulse = 1.0 + 0.045 * math.sin(t * 2.0 + seed)
        rx, ry = R * f * sx_scale * pulse, R * f * scale * pulse
        dim = -0.4 * (1 - min(1.0, max(0.0, (zt + 0.6) / 1.2)))
        rot = seed + ang * 0.7
        for row in range(int(fy - ry) - 1, int(fy + ry) + 2):
            dy = (row + 0.5 - fy) / ry
            for col in range(int(fx - rx) - 1, int(fx + rx) + 2):
                dx = (col + 0.5 - fx) / rx
                if kind == "disc":
                    s = math.sqrt(dx * dx + dy * dy)
                    if s > 1.0:
                        continue
                    if s < 0.3:
                        b = 0.55 - 0.35 * dx - 0.35 * dy + dim
                        b = min(0.999, max(0.0, b))
                        plot(col, row, zt + 0.06, "@" if s < 0.17 else "o",
                             palette_color(cpal, int(b * len(cpal))))
                        continue
                    ph = math.atan2(dy, dx)
                    reach = 0.32 + 0.68 * abs(math.cos(n_pet * (ph + rot) / 2)) ** 0.7
                    if s > reach:
                        continue
                    edge = -0.22 if s > reach - 0.14 else 0.0
                    b = 0.62 - 0.22 * dx - 0.28 * dy + 0.12 * s + edge + dim
                    b = min(0.999, max(0.0, b))
                    plot(col, row, zt + 0.04 * (1 - s),
                         PETAL_SHADE[int(b * len(PETAL_SHADE))],
                         palette_color(pal, int(b * len(pal))))
                else:
                    v = (1 - dy) / 2
                    if v < 0 or v > 1:
                        continue
                    hw = 0.62 * math.sin(math.pi * 0.5 * min(1.0, v * 1.5 + 0.05))
                    if hw <= 0 or abs(dx) > hw:
                        continue
                    xn = dx / hw
                    if v > 0.72 + 0.28 * math.cos(1.5 * math.pi * xn) ** 2:
                        continue
                    seam = -0.25 if abs(abs(xn) - 0.33) < 0.12 and v > 0.3 else 0.0
                    b = 0.55 - 0.3 * xn + 0.1 * v + seam + dim
                    b = min(0.999, max(0.0, b))
                    plot(col, row, zt + 0.03,
                         PETAL_SHADE[int(b * len(PETAL_SHADE))],
                         palette_color(pal, int(b * len(pal))))

    for x, y, z, phase in babies:
        col, row, zt = project(x, y, z)
        star = math.sin(t * 2 + phase) > 0.6
        plot(col, row, zt + 0.02, "*" if star else "·", palette_color(WHITE, 2 if star else 3))

    for x, y, z, phase, speed in sparkles:
        col, row, zt = project(x, y, z)
        tw = math.sin(t * speed + phase)
        if tw > 0.85:
            plot(col, row, zt, "*", palette_color(WHITE, 2))
        elif tw > 0.4:
            plot(col, row, zt, "+", palette_color(WHITE, 1))
        elif tw > 0.0:
            plot(col, row, zt, "·", palette_color(WHITE, 0))

    mrow = rows - 2
    start = max(0, (cols - len(MESSAGE)) // 2)
    shift = int(t * 6)
    for i, ch in enumerate(MESSAGE):
        if start + i < cols:
            chars[mrow][start + i] = ch
            colors[mrow][start + i] = palette_color(MSG_COLORS, (i + shift) % len(MSG_COLORS))
    hstart = max(0, (cols - len(hint)) // 2)
    for i, ch in enumerate(hint):
        if hstart + i < cols:
            chars[rows - 1][hstart + i] = ch
            colors[rows - 1][hstart + i] = palette_color(WHITE, 1)

    lines = []
    for r in range(rows):
        rc, rcol = chars[r], colors[r]
        last = -1
        parts = []
        for c in range(cols):
            ch = rc[c]
            if ch != " " and rcol[c] != last:
                last = rcol[c]
                parts.append(f"\033[38;5;{last}m")
            parts.append(ch)
        lines.append("".join(parts))
    return "\033[H" + "\n".join(lines) + RESET


def read_key():
    """Read one key without blocking the animation loop."""
    if not sys.stdin.isatty():
        return None
    if os.name == "nt":
        import msvcrt
        if msvcrt.kbhit():
            return msvcrt.getwch().lower()
        return None
    ready, _, _ = select.select([sys.stdin], [], [], 0)
    return sys.stdin.read(1).lower() if ready else None


def main():
    global NUM_HEARTS
    if os.name == "nt":
        os.system("")
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    speed = SPIN_SPEED
    color_mode = 0
    scene = build_scene(color_mode)
    hearts = []
    paused = False
    animation_time = 0.0
    closing = False
    close_started = None
    old_terminal = None
    if os.name != "nt" and sys.stdin.isatty():
        old_terminal = termios.tcgetattr(sys.stdin)
        tty.setcbreak(sys.stdin.fileno())
    sys.stdout.write("\033[?25l\033[2J")
    start = last = time.perf_counter()
    last_size = None
    try:
        while True:
            now = time.perf_counter()
            dt, last = now - last, now
            key = read_key()
            if key == "p" and not closing:
                paused = not paused
            elif key in ("+", "="):
                speed = min(3.0, speed + 0.1)
            elif key == "-":
                speed = max(0.1, speed - 0.1)
            elif key == "c":
                color_mode = (color_mode + 1) % len(COLOR_THEMES)
                scene = build_scene(color_mode)
            elif key == "h":
                NUM_HEARTS += 3
            elif key == "q" and not closing:
                closing = True
                close_started = now
            if not paused and not closing:
                animation_time += dt
            if closing and close_started is None:
                close_started = now
            size = shutil.get_terminal_size((80, 30))
            cols, rows = max(20, size.columns - 1), max(12, size.lines - 1)
            if (cols, rows) != last_size:
                sys.stdout.write("\033[2J")
                last_size = (cols, rows)
            update_hearts(hearts, dt)
            exit_progress = min(1.0, (now - close_started) / 1.0) if closing else 0.0
            sys.stdout.write(render(scene, animation_time, cols, rows, hearts,
                                    speed, color_mode, exit_progress,
                                    f"P: pause  +/-: speed  C: {COLOR_THEMES[color_mode]['name']}  H: hearts  Q: quit"))
            sys.stdout.flush()
            if closing and exit_progress >= 1.0:
                break
            wait = 1 / FPS - (time.perf_counter() - now)
            if wait > 0:
                time.sleep(wait)
    except KeyboardInterrupt:
        closing = True
        close_started = time.perf_counter()
        while time.perf_counter() - close_started < 1.0:
            now = time.perf_counter()
            progress = min(1.0, (now - close_started) / 1.0)
            size = shutil.get_terminal_size((80, 30))
            cols, rows = max(20, size.columns - 1), max(12, size.lines - 1)
            sys.stdout.write(render(scene, animation_time, cols, rows, hearts,
                                    speed, color_mode, progress,
                                    f"P: pause  +/-: speed  C: {COLOR_THEMES[color_mode]['name']}  H: hearts  Q: quit"))
            sys.stdout.flush()
            time.sleep(1 / FPS)
    finally:
        if old_terminal is not None:
            termios.tcsetattr(sys.stdin, termios.TCSADRAIN, old_terminal)
        sys.stdout.write(RESET + "\033[?25h\033[2J\033[H")
        print("\033[38;5;205m♥\033[0m")


main()
