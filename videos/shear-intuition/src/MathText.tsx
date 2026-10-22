import { useMemo, type CSSProperties } from "react";
import { renderToString } from "katex";
import "katex/dist/katex.min.css";

export const Latex = ({ children }: { children: string }) => {
  const html = useMemo(
    () =>
      renderToString(children, {
        throwOnError: true,
        strict: "error",
        trust: false,
      }),
    [children],
  );
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};

// The notation used by this episode; Chinese prose stays in the Chinese font.
export const MathText = ({ children }: { children: string | number }) => {
  const parts = String(children).split(/([A-Za-z0-9′'−+×=<>()[\],./\s-]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        /[A-Za-z0-9]/.test(part) ? (
          <Latex key={i}>
            {part
              .trim()
              .replace(/′/g, "'")
              .replace(/−/g, "-")
              .replace(/×/g, "\\times ")
              .replace(/(-?\d+)\/(\d+)/g, "\\frac{$1}{$2}")}
          </Latex>
        ) : (
          part
        ),
      )}
    </>
  );
};

export const SvgMathText = ({
  x,
  y,
  children,
  fontSize = 30,
  fill = "#172c45",
  align = "left",
  label = true,
}: {
  x: number;
  y: number;
  children: string | number;
  fontSize?: number;
  fill?: string;
  align?: "left" | "right" | "center";
  label?: boolean;
}) => (
  <foreignObject x={x} y={y} width={1} height={1} overflow="visible">
    <div
      data-diagram-label={label || undefined}
      style={
        {
          width: "max-content",
          whiteSpace: "nowrap",
          fontSize,
          color: fill,
          lineHeight: 1.2,
          transform: `translate(${align === "right" ? "-100%" : align === "center" ? "-50%" : "0"}, -80%)`,
        } as CSSProperties
      }
    >
      <MathText>{children}</MathText>
    </div>
  </foreignObject>
);
