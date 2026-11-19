"""Browser adapter for the same renderer used by the terminal program."""

import bouquet3d


class BrowserBouquet:
    def __init__(self):
        self.theme = 0
        self.flower_style = "original"
        self.scene = bouquet3d.build_scene(self.theme, self.flower_style)
        self.hearts = []
        self.elapsed = 0.0
        self.rotation = 0.0
        self.last_timestamp = None

    def frame(self, timestamp, paused, speed, theme, heart_count, message, reset_clock=False,
              flower_style="original", detail="classic"):
        if theme != self.theme or flower_style != self.flower_style:
            self.theme = theme
            self.flower_style = flower_style
            self.scene = bouquet3d.build_scene(theme, flower_style)
        bouquet3d.NUM_HEARTS = heart_count
        bouquet3d.MESSAGE = message or "for you ♥"
        if self.last_timestamp is None or reset_clock:
            self.last_timestamp = timestamp
        dt = min(max((timestamp - self.last_timestamp) / 1000.0, 0), 0.1)
        self.last_timestamp = timestamp
        if not paused:
            self.elapsed += dt
            self.rotation += speed * dt
        bouquet3d.update_hearts(self.hearts, 0 if paused else dt)
        hint = (f"P: pause  +/-: speed  C: {bouquet3d.COLOR_THEMES[theme]['name']}  "
                "H: hearts")
        cols, rows = (300, 90) if detail == "detailed" else (212, 53)
        return bouquet3d.render(self.scene, self.elapsed, cols, rows, self.hearts,
                                speed, theme, hint=hint, rotation=self.rotation)

