# Ascii Flower Bouquet

## Browser version

Select a scene to explore the flower bouquet, seasonal landscape, snow globe, aquarium, Earth, solar system, ocean, mountain rainstorm, New York fireworks, or mountain night sky. The tree offers four seasons; the globe can be shaken; the aquarium, ocean, and fireworks have color or sky controls. Edit the message, adjust the speed, and use **Share Scene** to create a link with those settings. The message and settings are stored in the URL, so anyone with the link can read them.

Earth's land mask is derived from the public-domain [Natural Earth 1:110m land dataset](https://www.naturalearthdata.com/downloads/110m-physical-vectors/). It is sampled at two-degree resolution to remain compact in the ASCII renderer. The solar-system orbits are stylized for readability and are not to scale.

The bouquet uses the same Python renderer as the terminal version. Choose a theme, roses, sunflowers, or a mixed bouquet, and select Classic or Detailed character rendering. The other scenes run directly in JavaScript using a character grid.

All scenes use a 300×90 character grid by default. Fine detail draws the scenes directly at that resolution; Classic keeps the earlier artwork. The bouquet's Classic option uses 212×53, while Fine detail uses 300×90. Select the detail level for any scene using the Detail control. Larger grids may run more slowly on some devices.

The aquarium includes multi-line fish, plants, coral, rocks, and sand. Choose water and fish palettes using its controls.

Use **+ Zoom** and scroll to inspect a scene on a small screen, or **Fit** to see the complete terminal. The site also supports full-screen mode where the browser allows it. The bouquet loads the Pyodide Python runtime from a CDN, so an internet connection is needed when it starts.

To preview it locally:

```bash
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

Run the checks with:

```bash
python3 -m unittest discover -s tests
node --test tests/browser.test.cjs
```

The Python checks need no additional packages. The JavaScript checks require Node.js.

The original terminal bouquet was created by [Alish Sharma](https://github.com/alishsharma17/Ascii-Flower-Bouquet-). The included MIT license retains the original copyright notice.

## Tips

- Make your terminal window big, or zoom out a bit (`Ctrl -` / `Cmd -`). More space means a smoother looking bouquet.
- Use a terminal that supports 256 colors. Most do: macOS Terminal, iTerm2, Windows Terminal, VS Code, and pretty much anything on Linux.
- If the hearts show up as weird boxes, switch your terminal font to something with good Unicode support.

## Make it yours

Open `bouquet3d.py` and change the values at the top:

| Setting | What it does |
| --- | --- |
| `MESSAGE` | The text under the bouquet. Put their name in here. |
| `SPIN_SPEED` | How fast it spins |
| `TILT` | How much you look down at it |
| `CAM_DIST` | Lower number = more dramatic perspective |
| `NUM_HEARTS` | How many hearts float in the background |
| `FPS` | Frame rate |

You can also swap the color lists (`PINK`, `RED`, `PURPLE`, etc.) to change the flowers. They're 256-color terminal codes.

## How it works

Every part of the bouquet is a set of 3D points. Each frame the points get rotated, projected onto the screen with perspective, and shaded based on a light direction. A depth buffer makes sure the closest thing wins each character spot. The flower heads are drawn as flat shapes that always face you so the petals stay readable while it spins.
