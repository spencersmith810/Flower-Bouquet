"""Browser adapter for the same renderer used by the terminal program."""

import bouquet3d


class BrowserBouquet:
    def __init__(self):
        self.theme = 0
        self.scene = bouquet3d.build_scene(self.theme)
        self.hearts = []
        self.elapsed = 0.0
        self.last_timestamp = None

    def frame(self, timestamp, paused, speed, theme, heart_count, message):
        if theme != self.theme:
            self.theme = theme
            self.scene = bouquet3d.build_scene(theme)
        bouquet3d.NUM_HEARTS = heart_count
        bouquet3d.MESSAGE = message or "for you ♥"
        if self.last_timestamp is None:
            self.last_timestamp = timestamp
        dt = min(max((timestamp - self.last_timestamp) / 1000.0, 0), 0.1)
        self.last_timestamp = timestamp
        if not paused:
            self.elapsed += dt
            bouquet3d.update_hearts(self.hearts, dt)
        hint = (f"P: pause  +/-: speed  C: {bouquet3d.COLOR_THEMES[theme]['name']}  "
                "H: hearts  Q: quit")
        return bouquet3d.render(self.scene, self.elapsed, 212, 53, self.hearts,
                                speed, theme, hint=hint)

