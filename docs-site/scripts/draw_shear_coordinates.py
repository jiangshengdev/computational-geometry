"""Generate the light/dark coordinate diagrams using Matplotlib MathText.

From the repository root (requires the maintainer-provisioned uv environment):
    uv run --offline --with matplotlib==3.11.2 python docs-site/scripts/draw_shear_coordinates.py
"""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt


OUTPUT = Path(__file__).resolve().parents[1] / "static" / "img"
PALETTES = {
    "light": {
        "background": "#ffffff", "text": "#172033", "axis": "#475569",
        "new_axis": "#7c3aed", "positive": "#1d4ed8", "negative": "#c2410c",
    },
    "dark": {
        "background": "#1b1b1d", "text": "#e3e3e3", "axis": "#cbd5e1",
        "new_axis": "#c4b5fd", "positive": "#93c5fd", "negative": "#fdba74",
    },
}


def draw(theme, colors):
    """Keep points fixed while changing the basis; only colors vary by theme."""
    with plt.rc_context({
        "mathtext.fontset": "cm", "font.family": "serif", "font.size": 19,
        "svg.fonttype": "path", "svg.hashsalt": "shear-coordinates",
        "text.color": colors["text"], "axes.titlecolor": colors["text"],
    }):
        fig, axes = plt.subplots(1, 2, figsize=(12, 7.2), facecolor=colors["background"])
        fig.subplots_adjust(left=.035, right=.98, bottom=.17, top=.77, wspace=.16)
        fig.suptitle(r"$x'=x+\frac{1}{2}y,\qquad y'=y$", fontsize=30, y=.96)
        for ax, skew in zip(axes, [False, True]):
            ax.set_xlim(-2.1, 4.1)
            ax.set_ylim(-1.8, 3.4)
            ax.set_aspect("equal")
            ax.axis("off")
            color = colors["new_axis"] if skew else colors["axis"]
            ax.plot([-1.9, 0], [0, 0], color=color, lw=1.8)
            ax.plot([.75 if skew else 0, 0], [-1.5, 0], color=color, lw=1.8)
            tip = (-1.55, 3.1) if skew else (0, 3.1)
            for end in [(3.7, 0), tip]:
                ax.annotate("", xy=end, xytext=(0, 0), arrowprops={
                    "arrowstyle": "->", "color": color, "lw": 1.8, "mutation_scale": 16,
                })
            ax.text(3.84, -.02, r"$x'$" if skew else r"$x$", color=color, va="center", fontsize=24)
            ax.text(tip[0]-.12, 3.22, r"$y'$" if skew else r"$y$", color=color, ha="center", fontsize=24)
            ax.text(-.13, -.28, r"$O$", ha="right", fontsize=20)
            for n in (1, 2, 3):
                ax.plot([n, n], [-.045, .045], color=color, lw=1.2)
                ax.text(n, -.29, f"${n}$", ha="center")
                vx = -.5*n if skew else 0
                ax.plot([vx-.045, vx+.045], [n, n], color=color, lw=1.2)
                ax.text(vx-.17, n, f"${n}$", ha="right", va="center")

            # P is physically (2, 2); its new horizontal coordinate is 3.
            positive = colors["positive"]
            ax.plot([-1 if skew else 0, 2, 3 if skew else 2], [2, 2, 0],
                    color=positive, lw=1.6, ls=(0, (4, 4)))
            ax.scatter([2], [2], s=55, color=positive, zorder=5)
            ax.text(2.14, 2.13, r"$P\;(3,2)$" if skew else r"$P\;(2,2)$",
                    color=positive, fontsize=23)

            # Q is physically (-1, -1); its new horizontal coordinate is -3/2.
            negative = colors["negative"]
            qx = -1.5 if skew else -1
            qy_axis_x = .5 if skew else 0
            ax.plot([qx, -1, qy_axis_x], [0, -1, -1], color=negative, lw=1.6, ls=(0, (4, 4)))
            ax.scatter([-1], [-1], s=55, color=negative, zorder=5)
            ax.text(-1.7, -1.6, r"$Q\;(-\frac{3}{2},-1)$" if skew else r"$Q\;(-1,-1)$",
                    color=negative, fontsize=23)
            ax.plot([qx, qx], [-.045, .045], color=color, lw=1.2)
            ax.text(qx, .16, r"$-\frac{3}{2}$" if skew else r"$-1$", ha="center")
            ax.plot([qy_axis_x-.045, qy_axis_x+.045], [-1, -1], color=color, lw=1.2)
            ax.text(qy_axis_x+.15, -1, r"$-1$", va="center")
            ax.set_title(r"$(x',y')$" if skew else r"$(x,y)$", fontsize=24, pad=18)

        fig.text(.265, .085, r"$P=2(1,0)+2(0,1)$", ha="center", fontsize=23)
        fig.text(.752, .085, r"$P=3(1,0)+2(-\frac{1}{2},1)$", ha="center", fontsize=23)
        output = OUTPUT / f"shear-coordinates-{theme}.svg"
        fig.savefig(output, facecolor=colors["background"], metadata={"Date": None})
        plt.close(fig)
        print(output)


if __name__ == "__main__":
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for theme, colors in PALETTES.items():
        draw(theme, colors)
