"""Build a compact terrain-color grid from NASA's July 2004 Blue Marble map.

Source: https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography/
Resize the 5400x2700 global JPEG to a 360x180, 24-bit BMP before running.
The classes approximate visible colors, not scientific land-cover categories.
"""
import struct
import sys
from pathlib import Path

data = Path(sys.argv[1]).read_bytes()
offset = struct.unpack_from('<I', data, 10)[0]
width, height = struct.unpack_from('<ii', data, 18)
bits = struct.unpack_from('<H', data, 28)[0]
if width != 360 or abs(height) != 180 or bits != 24:
    raise SystemExit('Expected a 360x180 24-bit BMP')
stride = (width * 3 + 3) & ~3


def color_class(red, green, blue):
    if min(red, green, blue) >= 170 and max(red, green, blue) - min(red, green, blue) < 35:
        return 'I'  # snow and ice
    if green > red * 1.15 and green > blue * 1.15:
        return 'F' if green < 65 else 'G'  # forest and vegetation
    if red > green * 1.3 and red > blue * 1.5:
        return 'R'  # reddish earth
    if red > green * 1.08 and red > blue * 1.3:
        return 'S' if red >= 150 else 'B'  # sand and brown terrain
    return 'O'  # grassland, scrub, or dark terrain


rows = []
for y in range(180):
    source_y = y if height < 0 else 179 - y
    row = data[offset + source_y * stride:offset + (source_y + 1) * stride]
    rows.append('"' + ''.join(color_class(*reversed(row[x * 3:x * 3 + 3])) for x in range(width)) + '"')
print('// NASA Blue Marble Next Generation with topography, July 2004, sampled at 1 degree.')
print('window.EARTH_TERRAIN = [\n' + ',\n'.join(rows) + '\n];')
