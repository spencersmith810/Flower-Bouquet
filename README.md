# Ascii Flower Bouquet

## Browser version

The web version uses the same Python renderer as the terminal version. Choose a theme, edit the message, adjust the speed, and use **Share Bouquet** to create a link with those settings. The message and settings are stored in the URL, so anyone with the link can read them.

Use **+ Zoom** and scroll to inspect the bouquet on a small screen, or **Fit** to see the complete terminal. The site also supports full-screen mode where the browser allows it. It loads the Pyodide Python runtime from a CDN, so an internet connection is needed when it starts.

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
