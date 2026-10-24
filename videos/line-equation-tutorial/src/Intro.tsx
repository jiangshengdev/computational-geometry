import { SvgMathText } from "./MathText";
import {
  Html5Audio,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { scenes } from "./intro-storyboard";
import {
  sourceFps,
  frameScale,
  audioLeadInFrames,
  storyboardSeconds,
} from "./timeline";
import type { CoordinateScale } from "./coordinates";
import {
  CoordinateGrid,
  diagramViewport,
  tutorialCoordinates,
} from "./CoordinateGrid";
import { ChapterLayout } from "./ChapterLayout";
import { MathLines } from "./MathLines";
import { objectColors, emphasisProgress } from "./teaching-emphasis";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const blue = objectColors.line;
const orange = objectColors.b;
// Fixed teaching illustration, not an algorithm trace. AB: y=2x+1.
// The other segment joins (0,7) to (4,2); intersection: (24/13,61/13).
const CoordinateDiagram = ({
  frame,
  scale,
}: {
  frame: number;
  scale?: CoordinateScale;
}) => {
  const coordinates = tutorialCoordinates(scale);
  const { x: px, y: py } = coordinates;
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
    <svg {...diagramViewport}>
      <defs>
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
      <CoordinateGrid coordinates={coordinates} />
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
          <circle cx={px(24 / 13)} cy={py(61 / 13)} r={18} fill="#fde7ab" />
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
      <g opacity={labelsOpacity}>
        <circle cx={px(1)} cy={py(3)} r="8" fill={objectColors.a} />
        <circle cx={px(3)} cy={py(7)} r="8" fill={objectColors.b} />
        <SvgMathText
          outlined
          fill={objectColors.a}
          x={px(1) + 18}
          y={py(3) - 18}
          fontSize="30"
        >
          A = (1, 3)
        </SvgMathText>
        <SvgMathText
          outlined
          fill={objectColors.b}
          x={px(3) + 18}
          y={py(7) - 18}
          fontSize="30"
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
    <ChapterLayout
      chapter={0}
      context={[scene.kicker]}
      diagram={
        <CoordinateDiagram
          frame={
            scene.start * sourceFps +
            storyboardSeconds(scene, frame - scene.from) * sourceFps
          }
        />
      }
      note={scene.note}
      content={
        <div
          style={{
            opacity: interpolate(
              (frame - scene.from) / frameScale,
              [0, 15],
              [0, 1],
              clamp,
            ),
          }}
        >
          <MathLines
            lines={[scene.title.replace(/\n/g, "")]}
            fontSize={42}
            emphasis={emphasisProgress((frame - scene.from) / frameScale)}
          />
        </div>
      }
    >
      {scenes.map((item) => (
        <Sequence
          key={item.id}
          from={item.from + audioLeadInFrames}
          durationInFrames={item.durationInFrames - audioLeadInFrames}
          name={item.kicker}
          layout="none"
        >
          <Html5Audio
            src={staticFile(
              `narration/${narrationFile(item.id, audioFiles[item.id])}`,
            )}
          />
        </Sequence>
      ))}
    </ChapterLayout>
  );
};
import timingData from "./audio-timing.json";
import { narrationFile } from "../../shared/speech/source";
const audioFiles: Record<string, { duration: number; audioFile?: string }> =
  timingData;
