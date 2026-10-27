"""Generate line-equation figures with the existing Matplotlib theme helpers.

Run with the same maintainer-provisioned environment as draw_shear_coordinates.py:
    uv run --offline --with matplotlib==3.11.2 python docs-site/scripts/draw_line_equation.py
"""

from draw_shear_coordinates import IMAGE_ROOT, PALETTES, plot_style, save_svg, plt

OUTPUT = IMAGE_ROOT / "segment-intersection" / "line-equation"


def coordinates(ax, colors, xmax, ymax):
    ax.set(xlim=(-.8, xmax + .8), ylim=(-.7, ymax + .8), aspect="equal")
    ax.axis("off")
    for end in [(xmax + .3, 0), (0, ymax + .3)]:
        ax.annotate("", xy=end, xytext=(0, 0), arrowprops={
            "arrowstyle": "->", "color": colors["axis"], "lw": 1.3,
        })
    ax.text(xmax + .45, -.1, "$X$", fontsize=20)
    ax.text(-.1, ymax + .5, "$Y$", ha="center", fontsize=20)
    ax.text(-.15, -.35, "$O$", ha="right", fontsize=16)
    for axis, maximum in [("x", xmax), ("y", ymax)]:
        for n in range(1, maximum + 1):
            if axis == "x":
                ax.plot([n, n], [-.05, .05], color=colors["axis"], lw=1)
                ax.text(n, -.35, f"${n}$", ha="center", fontsize=15)
            else:
                ax.plot([-.05, .05], [n, n], color=colors["axis"], lw=1)
                ax.text(-.18, n, f"${n}$", ha="right", va="center", fontsize=15)


def point(ax, x, y, label, color, offset=(10, 0), align="left", marker="o"):
    ax.scatter([x], [y], color=color, s=45, zorder=5, marker=marker)
    ax.annotate(label, (x, y), xytext=offset, textcoords="offset points",
                color=color, ha=align, va="center", fontsize=19)


def draw(theme, colors, kind):
    with plt.rc_context(plot_style(colors)):
        fig, ax = plt.subplots(figsize=(7, 6), facecolor=colors["background"])
        fig.subplots_adjust(left=.06, right=.94, bottom=.06, top=.94)
        blue, orange = colors["positive"], colors["negative"]
        if kind == "axis-lines":
            coordinates(ax, colors, 5, 5)
            ax.plot([2, 2], [0, 5.2], color=blue, lw=2)
            ax.plot([0, 5.2], [3, 3], color=orange, lw=2)
            point(ax, 2, 1, "$(2,1)$", blue)
            point(ax, 2, 4, "$(2,4)$", blue)
            point(ax, 1, 3, "$(1,3)$", orange, (0, -22), "center")
            point(ax, 4, 3, "$(4,3)$", orange, (0, -22), "center")
            ax.text(2.15, 5, "$X=2$", color=blue)
            ax.text(4.1, 3.35, "$Y=3$", color=orange)
        else:
            coordinates(ax, colors, 5, 10)
            ax.plot([-.65, 4.7], [-.3, 10.4], color=blue, lw=1.8,
                    ls="--" if kind == "segment" else "-")
            if kind == "points":
                for x in range(4):
                    point(ax, x, 2*x+1, f"$({x},{2*x+1})$", blue, (12, -5))
                ax.plot([2, 2], [5, 6], color=orange, lw=1.5, ls=":")
                point(ax, 2, 6, "$(2,6)$", orange, (-12, 8), "right", "x")
                ax.text(2, 9.4, "$Y=2X+1$", color=blue, ha="center")
            elif kind == "slope":
                ax.plot([1, 3, 3], [3, 3, 7], color=orange, lw=1.8, ls="--")
                ax.text(2, 2.35, "$3-1=2$", color=orange, ha="center")
                ax.text(3.18, 4.8, "$7-3=4$", color=orange)
                ax.plot([2.8, 2.8, 3], [3, 3.2, 3.2], color=orange, lw=1)
                point(ax, 1, 3, r"$A\,(1,3)$", blue, (-40, 16), "right")
                point(ax, 3, 7, r"$B\,(3,7)$", blue, (12, 0))
                ax.text(.6, 8.6, "$k=\\frac{4}{2}=2$", color=blue, fontsize=24)
            else:
                ax.plot([1, 3], [3, 7], color=blue, lw=5, solid_capstyle="round")
                point(ax, 1, 3, r"$A\,(1,3)$", blue)
                point(ax, 3, 7, r"$B\,(3,7)$", blue)
                point(ax, 4, 9, r"$P\,(4,9)$", orange, (-12, 8), "right")
                ax.plot([1, 1], [0, 3], color=colors["axis"], ls=":", lw=1)
                ax.plot([3, 3], [0, 7], color=colors["axis"], ls=":", lw=1)
                ax.plot([1, 3], [0, 0], color=blue, lw=4)
                ax.text(2, .45, "$1\\leq X\\leq3$", color=blue, ha="center", fontsize=17)
        save_svg(fig, OUTPUT / theme / f"line-equation-{kind}-{theme}.svg", colors)
        plt.close(fig)


if __name__ == "__main__":
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for theme, colors in PALETTES.items():
        for kind in ("points", "slope", "axis-lines", "segment"):
            draw(theme, colors, kind)
