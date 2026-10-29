"""Render a JSON list of LaTeX labels using the existing MathText style.

Python is used only for Matplotlib's mathematical typography API.
Each label returns a standalone SVG and its baseline metrics.
"""

import json
import re
import sys
from io import StringIO
from xml.etree import ElementTree

from matplotlib.font_manager import FontProperties
from matplotlib.mathtext import math_to_image

from draw_shear_coordinates import PALETTES, plot_style, plt


def render(formula):
    buffer = StringIO()
    depth = math_to_image(
        formula, buffer, prop=FontProperties(size=100), format="svg",
        color="#010203",
    )
    source = buffer.getvalue()
    source = source[source.index("<svg"):].replace("#010203", "currentColor")
    source = re.sub(r"<metadata>.*?</metadata>", "", source, flags=re.DOTALL)
    source = re.sub(r"<style[^>]*>.*?</style>", "", source, flags=re.DOTALL)
    source = re.sub(r"\s+", " ", source).strip()
    root = ElementTree.fromstring(source)
    return {
        "svg": source,
        "width": float(root.attrib["width"].removesuffix("pt")),
        "height": float(root.attrib["height"].removesuffix("pt")),
        "depth": depth,
    }


if __name__ == "__main__":
    with plt.rc_context({**plot_style(PALETTES["light"]), "savefig.transparent": True}):
        json.dump({formula: render(formula) for formula in json.load(sys.stdin)}, sys.stdout)
