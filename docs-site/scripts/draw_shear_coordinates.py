"""Generate the light/dark coordinate diagrams using Matplotlib MathText.

From the repository root (requires the maintainer-provisioned uv environment):
    uv run --offline --with matplotlib==3.11.2 python docs-site/scripts/draw_shear_coordinates.py
"""

from pathlib import Path
from io import StringIO

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


def plot_style(colors):
    """Share mathematical typography and theme colors across both diagrams."""
    return {
        "mathtext.fontset": "cm", "font.family": "serif", "font.size": 19,
        "svg.fonttype": "path", "svg.hashsalt": "shear-coordinates",
        "text.color": colors["text"], "axes.titlecolor": colors["text"],
    }


def save_svg(fig, output, colors):
    """Normalize Matplotlib's path whitespace as part of asset generation."""
    buffer = StringIO()
    fig.savefig(buffer, format="svg", facecolor=colors["background"], metadata={"Date": None})
    output.write_text("\n".join(line.rstrip() for line in buffer.getvalue().splitlines()) + "\n", encoding="utf-8")


def draw(theme, colors):
    """Keep points fixed while changing the basis; only colors vary by theme."""
    with plt.rc_context(plot_style(colors)):
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
        save_svg(fig, output, colors)
        plt.close(fig)
        print(output)


def draw_order_reversal(theme, colors):
    """Show the active shear of A=(0,200), B=(1,0) with s=1/100."""
    with plt.rc_context(plot_style(colors)):
        fig, axes = plt.subplots(1, 2, figsize=(12, 5.8), facecolor=colors["background"])
        fig.subplots_adjust(left=.06, right=.97, bottom=.19, top=.76, wspace=.25)
        fig.suptitle(r"$x'=x+\frac{1}{100}y,\qquad y'=y$", fontsize=30, y=.96)
        for ax, transformed in zip(axes, [False, True]):
            ax.set_xlim(-.55, 3)
            ax.set_ylim(-35, 265)
            ax.axis("off")
            color = colors["new_axis"] if transformed else colors["axis"]
            for end in [(2.7, 0), (0, 245)]:
                ax.annotate("", xy=end, xytext=(0, 0), arrowprops={
                    "arrowstyle": "->", "color": color, "lw": 1.8, "mutation_scale": 16,
                })
            ax.text(2.82, 0, r"$x'$" if transformed else r"$x$", color=color, va="center", fontsize=24)
            ax.text(-.1, 255, r"$y'$" if transformed else r"$y$", color=color, ha="center", fontsize=24)
            for n in (0, 1, 2):
                ax.plot([n, n], [-4, 4], color=color, lw=1.2)
                ax.text(n, -24, f"${n}$", ha="center")
            ax.text(-.13, 200, r"$200$", ha="right", va="center")
            a_x = 2 if transformed else 0
            ax.plot([a_x, a_x], [200, 0], color=colors["positive"], lw=1.6, ls=(0, (4, 4)))
            ax.scatter([a_x], [200], s=55, color=colors["positive"], zorder=5)
            ax.text(a_x-.12 if transformed else .12, 215,
                    r"$A'\;(2,200)$" if transformed else r"$A\;(0,200)$",
                    color=colors["positive"], fontsize=23, ha="right" if transformed else "left")
            ax.scatter([1], [0], s=55, color=colors["negative"], zorder=5)
            ax.text(1, 20, r"$B'\;(1,0)$" if transformed else r"$B\;(1,0)$",
                    color=colors["negative"], fontsize=23, ha="center")
            ax.set_title(r"$(x',y')$" if transformed else r"$(x,y)$", fontsize=24, pad=18)
        fig.text(.265, .085, r"$x_A=0<1=x_B$", ha="center", fontsize=24)
        fig.text(.752, .085, r"$x'_B=1<2=x'_A$", ha="center", fontsize=24)
        output = OUTPUT / f"shear-order-reversal-{theme}.svg"
        save_svg(fig, output, colors)
        plt.close(fig)
        print(output)


def draw_axis_steps(theme, colors):
    """Reveal one fixed point in the new and original coordinates, step by step."""
    captions = [
        r"$y'=2$",
        r"$(x',y')=(0,2)$",
        r"$y=y'=2$",
        r"$0=x+\frac{1}{2}\times2\quad\Rightarrow\quad x=-1$",
        r"$(x,y)=(-1,2)$",
    ]
    with plt.rc_context(plot_style(colors)):
        for step, caption in enumerate(captions, start=1):
            fig, ax = plt.subplots(figsize=(7, 4.8), facecolor=colors["background"])
            fig.subplots_adjust(left=.08, right=.92, bottom=.22, top=.93)
            ax.set(xlim=(-2, 1.3), ylim=(-.6, 3), aspect="equal")
            ax.axis("off")
            new = colors["new_axis"]
            old = colors["axis"]
            point = colors["positive"]
            for end in [(1, 0), (-1.35, 2.7)]:
                ax.annotate("", xy=end, xytext=(0, 0), arrowprops={
                    "arrowstyle": "->", "color": new, "lw": 1.8,
                })
            ax.plot([-1.65, 0], [0, 0], color=new, lw=1.8)
            ax.text(1.06, 0, r"$x'$" if step < 3 else r"$x,\ x'$", color=new, va="center", fontsize=22)
            ax.text(-1.4, 2.8, r"$y'$", color=new, ha="center", fontsize=22)
            ax.text(.08, -.24, r"$O$", fontsize=18)
            for n in (1, 2):
                ax.plot([-.5*n-.05, -.5*n+.05], [n, n], color=new, lw=1.2)
                ax.text(-.5*n-.16, n, f"${n}$", color=new, ha="right", va="center")
            ax.scatter([-1], [2], s=75, color=point, zorder=6)
            if step == 1:
                ax.scatter([-1], [2], s=260, facecolors="none", edgecolors=point, lw=1.5, zorder=5)
            if step == 2:
                # Follow the new vertical axis to the origin, where x' is zero.
                ax.annotate("", xy=(0, 0), xytext=(-1, 2), arrowprops={
                    "arrowstyle": "->", "color": point, "linestyle": "--", "lw": 1.5,
                })
                ax.scatter([0], [0], s=75, facecolors="none", edgecolors=point, zorder=6)
                ax.text(-.1, -.4, r"$x'=0$", color=point, ha="right", fontsize=20)
            if step >= 3:
                ax.annotate("", xy=(0, 2.7), xytext=(0, 0), arrowprops={
                    "arrowstyle": "->", "color": old, "lw": 1.8,
                })
                ax.text(.08, 2.8, r"$y$", color=old, fontsize=22)
                ax.plot([-1, 0], [2, 2], color=point, ls="--", lw=1.5)
                ax.plot([-.05, .05], [2, 2], color=old, lw=1.2)
                ax.text(.12, 2, r"$2$", color=point, va="center")
            if step >= 4:
                ax.plot([-1, -1], [0, 2], color=point, ls="--", lw=1.5)
                ax.text(-1, -.27, r"$-1$", color=point, ha="center")
            if step == 5:
                for start, end in [((0, 0), (-1, 0)), ((-1, 0), (-1, 2))]:
                    ax.annotate("", xy=end, xytext=start, arrowprops={
                        "arrowstyle": "->", "color": colors["negative"], "lw": 2.6,
                    })
                ax.text(-.5, -.32, r"$1$", color=colors["negative"], ha="center")
                ax.text(-1.15, .9, r"$2$", color=colors["negative"], ha="right")
            fig.text(.5, .075, caption, ha="center", fontsize=22, color=point)
            output = OUTPUT / f"shear-axis-step-{step}-{theme}.svg"
            save_svg(fig, output, colors)
            plt.close(fig)
            print(output)


if __name__ == "__main__":
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for theme, colors in PALETTES.items():
        draw(theme, colors)
        draw_order_reversal(theme, colors)
        draw_axis_steps(theme, colors)
