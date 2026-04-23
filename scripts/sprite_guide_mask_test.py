from __future__ import annotations

import unittest

import numpy as np
from PIL import Image

from scripts.sprite_guide_mask import apply_guide_mask, build_guide_mask


class SpriteGuideMaskTest(unittest.TestCase):
    def test_build_guide_mask_marks_remove_protect_and_unknown(self) -> None:
        support = Image.new("RGBA", (9, 9), (0, 0, 0, 0))
        pixels = support.load()
        for y in range(2, 7):
            for x in range(2, 7):
                pixels[x, y] = (255, 255, 255, 255)

        guide = build_guide_mask(support, protect_px=1, unknown_px=1)
        arr = np.array(guide)

        self.assertEqual(tuple(arr[0, 0]), (255, 0, 255, 255))
        self.assertEqual(tuple(arr[4, 4]), (255, 255, 255, 255))
        self.assertEqual(tuple(arr[1, 4]), (0, 0, 0, 255))

    def test_apply_guide_mask_uses_magenta_and_fallback_alpha(self) -> None:
        source = Image.new("RGBA", (5, 5), (10, 20, 30, 255))
        guide = Image.new("RGBA", (5, 5), (0, 0, 0, 255))
        fallback = Image.new("RGBA", (5, 5), (0, 0, 0, 0))

        guide_pixels = guide.load()
        fallback_pixels = fallback.load()
        guide_pixels[0, 0] = (255, 0, 255, 255)
        guide_pixels[4, 4] = (255, 255, 255, 255)
        fallback_pixels[2, 2] = (0, 0, 0, 128)

        result = apply_guide_mask(source, guide, fallback_alpha_image=fallback)

        self.assertEqual(result.getpixel((0, 0))[3], 0)
        self.assertEqual(result.getpixel((4, 4))[3], 255)
        self.assertEqual(result.getpixel((2, 2))[3], 128)


if __name__ == "__main__":
    unittest.main()
