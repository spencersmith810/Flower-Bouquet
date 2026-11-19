import random
import re
import unittest

import bouquet3d
from browser_renderer import BrowserBouquet


def plain(text):
    return re.sub(r"\x1b\[[0-9;]*[mH]", "", text)


class BrowserRendererTests(unittest.TestCase):
    def setUp(self):
        random.seed(123)
        self.bouquet = BrowserBouquet()

    def test_initial_frame_matches_terminal_renderer(self):
        actual = self.bouquet.frame(0, False, .6, 0, 18, "for you ♥")
        random.seed(123)
        bouquet3d.NUM_HEARTS = 18
        bouquet3d.MESSAGE = "for you ♥"
        hearts = []
        bouquet3d.update_hearts(hearts, 0)
        expected = bouquet3d.render(
            bouquet3d.build_scene(0), 0, 212, 53, hearts, .6, 0,
            hint="P: pause  +/-: speed  C: Original  H: hearts", rotation=0,
        )
        self.assertEqual(actual, expected)

    def test_pause_and_resume_do_not_jump(self):
        self.bouquet.frame(0, False, .6, 0, 18, "test")
        self.bouquet.frame(100, False, .6, 0, 18, "test")
        before = self.bouquet.rotation
        self.bouquet.frame(5000, True, .6, 0, 18, "test", True)
        self.bouquet.frame(10000, False, .6, 0, 18, "test", True)
        self.assertEqual(self.bouquet.rotation, before)

    def test_speed_changes_preserve_angle(self):
        self.bouquet.frame(0, False, .6, 0, 18, "test")
        self.bouquet.frame(100, False, .6, 0, 18, "test")
        before = self.bouquet.rotation
        self.bouquet.frame(200, False, 1.0, 0, 18, "test")
        self.assertAlmostEqual(self.bouquet.rotation, before + 0.1)

    def test_customization_works_while_paused(self):
        rendered = self.bouquet.frame(0, True, .6, 2, 21, "Hello!")
        self.assertIn("Hello!", plain(rendered))
        self.assertIn("Sunset", plain(rendered))
        self.assertEqual(len(self.bouquet.hearts), 21)

    def test_flower_styles_have_distinct_shapes(self):
        for style, expected in (("roses", {"rose"}), ("sunflowers", {"sunflower"}),
                                ("mixed", {"rose", "sunflower", "tulip"})):
            with self.subTest(style=style):
                scene = bouquet3d.build_scene(0, style)
                self.assertEqual({flower[1] for flower in scene[1]}, expected)
                self.assertTrue(bouquet3d.render(scene, 3, 212, 53, [], rotation=0))

    def test_detailed_mode_uses_more_character_cells(self):
        classic = self.bouquet.frame(0, True, .6, 0, 0, "test")
        detailed = self.bouquet.frame(0, True, .6, 0, 0, "test", False, "roses", "detailed")
        classic_lines = plain(classic).splitlines()
        detailed_lines = plain(detailed).splitlines()
        self.assertEqual((len(classic_lines), len(classic_lines[0])), (53, 212))
        self.assertEqual((len(detailed_lines), len(detailed_lines[0])), (90, 300))
        self.assertTrue(all(len(line) == 300 for line in detailed_lines))
        self.assertEqual(self.bouquet.flower_style, "roses")


if __name__ == "__main__":
    unittest.main()
