import { MathText, SvgMathText } from "./MathText";
import {
  AbsoluteFill,
  Html5Audio,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { scenes } from "./intro-storyboard";
import { fps } from "./timeline";
import {
  createCoordinates,
  coordinateTicks,
  type CoordinateScale,
} from "./coordinates";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const blue = "#2563eb";
const orange = "#d66a24";
// Fixed teaching illustration, not an algorithm trace. AB: y=2x+1.
// The other segment joins (0,7) to (4,2); intersection: (24/13,61/13).
const CoordinateDiagram = ({
  frame,
  scale,
}: {
  frame: number;
  scale?: CoordinateScale;
}) => {
  const {
    x: px,
    y: py,
    xMax,
    yMax,
    notice,
  } = createCoordinates({
    left: 210,
    bottom: 790,
    width: 660,
    height: 648,
    xMax: 6,
    yMax: 9,
    scale,
  });
  const secondOpacity = interpolate(frame, [540, 570], [1, 0], clamp);
  const labelsOpacity = interpolate(frame, [555, 585], [0, 1], clamp);
  const extension = interpolate(frame, [870, 930], [0, 1], clamp);
  const blueWidth = interpolate(
    frame,
    [240, 270, 345, 375],
    [6, 11, 11, 6],
    clamp,
  );
  const orangeWidth = interpolate(
    frame,
    [375, 405, 510, 540],
    [6, 11, 11, 6],
    clamp,
  );
  return (
    <svg
      width="1040"
      height="850"
      viewBox="0 0 1040 850"
      style={{ position: "absolute", left: 0, top: 40 }}
    >
      <defs>
        <marker
          id="axis-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#738399" />
        </marker>
        <marker
          id="line-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="4"
          markerHeight="4"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={blue} />
        </marker>
      </defs>
      {coordinateTicks(xMax).map((x) => (
        <line
          key={`x${x}`}
          x1={px(x)}
          x2={px(x)}
          y1={py(yMax)}
          y2={py(0)}
          stroke="#dce4ec"
          strokeWidth="2"
        />
      ))}
      {coordinateTicks(yMax).map((y) => (
        <line
          key={`y${y}`}
          x1={px(0)}
          x2={px(xMax)}
          y1={py(y)}
          y2={py(y)}
          stroke="#dce4ec"
          strokeWidth="2"
        />
      ))}
      <path
        d={`M ${px(0)} ${py(yMax) - 21.6} V ${py(0)} H ${px(xMax) + 33}`}
        fill="none"
        stroke="#738399"
        strokeWidth="3"
        markerStart="url(#axis-arrow)"
        markerEnd="url(#axis-arrow)"
      />
      {coordinateTicks(xMax)
        .filter((x) => x !== 0)
        .map((x) => (
          <SvgMathText
            key={x}
            x={px(x)}
            y={py(0) + 35}
            textAnchor="middle"
            fontSize="25"
            fill="#65758a"
          >
            {x}
          </SvgMathText>
        ))}
      {coordinateTicks(yMax)
        .filter((y) => y !== 0)
        .map((y) => (
          <SvgMathText
            key={y}
            x={px(0) - 25}
            y={py(y) + 9}
            textAnchor="end"
            fontSize="25"
            fill="#65758a"
          >
            {y}
          </SvgMathText>
        ))}
      <g fontSize="30" fill="#65758a">
        <SvgMathText fontSize={30} fill="#65758a" x={px(0) - 32} y={py(0) + 35}>
          0
        </SvgMathText>
        <SvgMathText
          fontSize={30}
          fill="#65758a"
          x={px(xMax) + 44}
          y={py(0) + 10}
        >
          X
        </SvgMathText>
        <SvgMathText
          fontSize={30}
          fill="#65758a"
          x={px(0) - 12}
          y={py(yMax) - 43.2}
        >
          Y
        </SvgMathText>
      </g>
      {notice ? (
        <SvgMathText
          x={px(xMax)}
          y={py(yMax) - 20}
          textAnchor="end"
          fontSize="24"
          fill="#65758a"
        >
          {notice}
        </SvgMathText>
      ) : null}
      <g opacity={interpolate(frame, [0, 24], [0, 1], clamp)}>
        <line
          x1={px(1)}
          y1={py(3)}
          x2={px(3)}
          y2={py(7)}
          stroke={blue}
          strokeWidth={blueWidth}
          strokeLinecap="round"
        />
        <line
          x1={px(0)}
          y1={py(7)}
          x2={px(4)}
          y2={py(2)}
          stroke={orange}
          strokeWidth={orangeWidth}
          strokeLinecap="round"
          opacity={secondOpacity}
        />
        <g opacity={secondOpacity}>
          <circle
            cx={px(24 / 13)}
            cy={py(61 / 13)}
            r={18 + 3 * Math.sin(frame / 18)}
            fill="#fde7ab"
          />
          <circle cx={px(24 / 13)} cy={py(61 / 13)} r="7" fill="#172c45" />
        </g>
      </g>
      {extension > 0 && (
        <g
          stroke={blue}
          strokeWidth="5"
          strokeDasharray="12 10"
          opacity={extension}
        >
          <line
            x1={px(1)}
            y1={py(3)}
            x2={px(1 - 1.4 * extension)}
            y2={py(3 - 2.8 * extension)}
            markerEnd="url(#line-arrow)"
          />
          <line
            x1={px(3)}
            y1={py(7)}
            x2={px(3 + extension)}
            y2={py(7 + 2 * extension)}
            markerEnd="url(#line-arrow)"
          />
        </g>
      )}
      <g opacity={labelsOpacity} fill={blue}>
        <circle cx={px(1)} cy={py(3)} r="8" />
        <circle cx={px(3)} cy={py(7)} r="8" />
        <SvgMathText
          outlined
          fill={blue}
          x={px(1) + 25}
          y={py(3) + 30}
          fontSize="34"
        >
          A = (1, 3)
        </SvgMathText>
        <SvgMathText
          outlined
          fill={blue}
          x={px(3) + 25}
          y={py(7) - 12}
          fontSize="34"
        >
          B = (3, 7)
        </SvgMathText>
      </g>
    </svg>
  );
};

export const Intro = () => {
  const frame = useCurrentFrame();
  const scene =
    scenes.find(
      (item) => frame >= item.from && frame < item.from + item.durationInFrames,
    ) ?? scenes[scenes.length - 1];
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#f6f8fb",
        color: "#172c45",
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 65,
          fontSize: 28,
          color: "#65758a",
          letterSpacing: 3,
        }}
      >
        由两个端点写出直线方程 · <MathText>01</MathText>
      </div>
      <CoordinateDiagram
        frame={
          scene.start * fps +
          ((frame - scene.from) / scene.durationInFrames) *
            (scene.end - scene.start) *
            fps
        }
      />
      <div
        style={{
          position: "absolute",
          left: 1050,
          top: 285,
          width: 750,
          opacity: interpolate(frame - scene.from, [0, 15], [0, 1], clamp),
        }}
      >
        <div style={{ fontSize: 28, color: blue, marginBottom: 28 }}>
          {scene.kicker}
        </div>
        <div
          style={{
            fontSize: 68,
            fontWeight: 600,
            lineHeight: 1.45,
            whiteSpace: "pre-line",
          }}
        >
          <MathText>{scene.title}</MathText>
        </div>
        <div
          style={{
            fontSize: 34,
            color: "#65758a",
            marginTop: 35,
            lineHeight: 1.6,
          }}
        >
          <MathText>{scene.note}</MathText>
        </div>
      </div>
      {scenes.map((item) => (
        <Sequence
          key={item.id}
          from={item.from + 6}
          durationInFrames={item.durationInFrames - 6}
          name={item.kicker}
          layout="none"
        >
          <Html5Audio src={staticFile(`narration/${item.id}.mp3`)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
