import { SvgMathText } from "./MathText";
import {
  createCoordinates,
  coordinateTicks,
  type CoordinateScale,
} from "./coordinates";

export const tutorialCoordinates = (scale?: CoordinateScale) =>
  createCoordinates({
    left: 120,
    bottom: 700,
    width: 660,
    height: 585,
    xMax: 6,
    yMax: 9,
    scale,
  });

export const CoordinateGrid = ({
  coordinates,
}: {
  coordinates: ReturnType<typeof tutorialCoordinates>;
}) => {
  const { x, y, xMax, yMax, notice } = coordinates;
  return (
    <>
      {coordinateTicks(xMax).map((v) => (
        <g key={`x${v}`}>
          <line x1={x(v)} x2={x(v)} y1={y(yMax)} y2={y(0)} stroke="#dce4ec" />
          <SvgMathText x={x(v)} y={y(0) + 28} fontSize="22" fill="#738399">
            {v}
          </SvgMathText>
        </g>
      ))}
      {coordinateTicks(yMax)
        .filter((v) => v !== 0)
        .map((v) => (
          <g key={`y${v}`}>
            <line x1={x(0)} x2={x(xMax)} y1={y(v)} y2={y(v)} stroke="#dce4ec" />
            <SvgMathText
              x={x(0) - 30}
              y={y(v) + 8}
              fontSize="22"
              fill="#738399"
            >
              {v}
            </SvgMathText>
          </g>
        ))}
      <path
        d={`M ${x(0)} ${y(yMax) - 39} V ${y(0)} H ${x(xMax) + 44}`}
        stroke="#738399"
        strokeWidth="3"
        fill="none"
      />
      <SvgMathText x={x(xMax) + 44} y={y(0) - 10} fontSize="26" fill="#738399">
        X
      </SvgMathText>
      <SvgMathText x={x(0) + 15} y={y(yMax) - 39} fontSize="26" fill="#738399">
        Y
      </SvgMathText>
      {notice ? (
        <SvgMathText
          x={x(xMax)}
          y={y(yMax) - 20}
          textAnchor="end"
          fontSize="24"
          fill="#65758a"
        >
          {notice}
        </SvgMathText>
      ) : null}
    </>
  );
};
