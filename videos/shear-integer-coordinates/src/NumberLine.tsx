import { SvgMathText } from "./MathText";

// A one-dimensional teaching diagram; it does not project two coordinate axes.
export const NumberLine = ({
  mode,
  visibleStep,
}: {
  mode: "absolute" | "distance";
  visibleStep: number;
}) => {
  const absolute = mode === "absolute";
  const x = (value: number) => 415 + value * 65;
  return (
    <svg width="830" height="740" viewBox="0 0 830 740" data-number-line>
      <SvgMathText x={415} y={115} align="center" fontSize={30}>
        {absolute ? "数轴上的距离" : "任意两个坐标都在这个区间内"}
      </SvgMathText>
      <path
        d="M90 340 H750 L738 333 M750 340 L738 347"
        fill="none"
        stroke="#526579"
        strokeWidth="3"
      />
      {(absolute ? [-4, 0, 3] : [-4, 0, 4]).map((value) => (
        <g key={value}>
          <path d={`M${x(value)} 330 V350`} stroke="#526579" strokeWidth="2" />
          <SvgMathText x={x(value)} y={390} align="center" fontSize={30}>
            {absolute || value === 0 ? String(value) : value < 0 ? "−M" : "M"}
          </SvgMathText>
        </g>
      ))}
      {absolute ? (
        <>
          {visibleStep >= 2 ? (
            <g>
              <path
                d={`M${x(-4)} 290 V260 H${x(0)} V290`}
                fill="none"
                stroke="#2563eb"
                strokeWidth="4"
              />
              <SvgMathText
                x={x(-2)}
                y={235}
                align="center"
                fontSize={30}
                fill="#2563eb"
              >
                距离 4
              </SvgMathText>
            </g>
          ) : null}
          {visibleStep >= 4 ? (
            <g>
              <path
                d={`M${x(0)} 430 V460 H${x(3)} V430`}
                fill="none"
                stroke="#7c3db5"
                strokeWidth="4"
              />
              <SvgMathText
                x={x(1.5)}
                y={510}
                align="center"
                fontSize={30}
                fill="#7c3db5"
              >
                距离 3
              </SvgMathText>
            </g>
          ) : null}
        </>
      ) : (
        <>
          <path
            data-interval
            d={`M${x(-4)} 340 H${x(4)}`}
            stroke="#b45309"
            strokeWidth="7"
          />
          {visibleStep >= 2 ? (
            <g>
              <path
                d={`M${x(-4)} 290 V250 H${x(4)} V290`}
                fill="none"
                stroke="#b45309"
                strokeWidth="3"
              />
              <SvgMathText x={415} y={220} align="center" fontSize={30}>
                最远距离：M − (−M) = 2M
              </SvgMathText>
            </g>
          ) : null}
          {visibleStep >= 3 ? (
            <>
              <circle cx={x(-2)} cy={340} r={8} fill="#7c3db5" />
              <circle cx={x(3)} cy={340} r={8} fill="#2563eb" />
              <SvgMathText x={415} y={500} align="center" fontSize={28}>
                内部两点的距离不会超过整个区间
              </SvgMathText>
            </>
          ) : null}
        </>
      )}
    </svg>
  );
};
