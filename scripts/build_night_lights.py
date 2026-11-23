"""Convert a 720x360, 24-bit BMP of NASA's Black Marble into a compact JS grid.

Source: https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/
The source image is the 2016 grayscale, 0.1-degree global composite. Resize it
to 720x360 before conversion; each output cell represents half a degree.
"""
import struct
import sys
from pathlib import Path

data = Path(sys.argv[1]).read_bytes()
offset = struct.unpack_from('<I', data, 10)[0]
width, height = struct.unpack_from('<ii', data, 18)
bits = struct.unpack_from('<H', data, 28)[0]
if width != 720 or abs(height) != 360 or bits != 24:
    raise SystemExit('Expected a 720x360 24-bit BMP')
stride = (width * 3 + 3) & ~3
rows = []
for y in range(360):
    source_y = y if height < 0 else 359 - y
    row = data[offset + source_y * stride:offset + (source_y + 1) * stride]
    levels = [min(9, row[x * 3] // 12) for x in range(width)]
    rows.append('"' + ''.join(map(str, levels)) + '"')
print('// NASA Black Marble, 2016 grayscale composite, sampled at 0.5 degrees.')
print('window.EARTH_NIGHT_LIGHTS = [\n' + ',\n'.join(rows) + '\n];')
