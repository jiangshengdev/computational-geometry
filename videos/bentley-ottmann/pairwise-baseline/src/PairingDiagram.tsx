import { inputColors, colors, tints } from "../../colors.ts";
import { Latex, MathText } from "./MathText";

export type PairingState = {
  selection: number;
  first: number;
  merge: number;
};
const inputs = [1, 2, 3, 4];
const pairs = inputs.flatMap((first) =>
  inputs.filter((second) => second > first).map((second) => [first, second]),
);
const blue = inputColors[0];
const amber = colors.amber;

/** Arrows represent selection order, never a directed intersection result. */
function PairMerge({
  first,
  second,
  progress,
}: {
  first: number;
  second: number;
  progress: number;
}) {
  return (
    <div
      data-pair-merge
      style={{ position: "relative", width: 240, height: 140 }}
    >
      {[false, true].map((reverse) => (
        <div
          key={String(reverse)}
          style={{
            position: "absolute",
            left: 20,
            top: reverse ? 76 - 38 * progress : 38 * progress,
            width: 200,
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `2px solid ${blue}`,
            borderRadius: 10,
            background: tints.input,
            opacity: 1 - progress,
            fontSize: 28,
          }}
        >
          <Latex
            colorize={false}
          >{`${reverse ? second : first}\\to${reverse ? first : second}`}</Latex>
        </div>
      ))}
      <div
        style={{
          position: "absolute",
          left: 20,
          top: 38,
          width: 200,
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          border: `2px solid ${amber}`,
          borderRadius: 10,
          background: tints.attention,
          opacity: progress,
        }}
      >
        <MathText>{`${first} 与 ${second}`}</MathText>
      </div>
    </div>
  );
}

export function PairingDiagram({
  page,
  visibleStep,
  state,
  shift,
}: {
  page: string;
  visibleStep: number;
  state: PairingState;
  shift: number;
}) {
  if (page === "ordered")
    return (
      <div
        data-page-block
        data-pairing-diagram
        style={{
          display: "flex",
          gap: 70,
          alignItems: "center",
          justifyContent: "center",
          height: 310,
        }}
      >
        <div
          style={{
            width: 520,
            textAlign: "center",
            transform: `translateX(${328 * (1 - shift)}px)`,
            visibility: visibleStep >= 1 ? "visible" : "hidden",
          }}
        >
          <div style={{ fontSize: 26, marginBottom: 24 }}>四份输入的身份</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 18 }}>
            {inputs.map((input) => (
              <div
                key={input}
                style={{
                  width: 84,
                  height: 70,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 32,
                  border: `3px solid ${state.first === input ? amber : "#94a3b8"}`,
                  borderRadius: 12,
                  background: state.first === input ? tints.attention : "#fff",
                  transform: `translateY(${state.first === input ? -8 * state.selection : 0}px)`,
                }}
              >
                <Latex colorize={false}>{String(input)}</Latex>
              </div>
            ))}
          </div>
          <div
            style={{
              fontSize: 26,
              marginTop: 20,
              visibility: visibleStep >= 4 ? "visible" : "hidden",
            }}
          >
            选定第一份后，排除自身
          </div>
        </div>
        <div
          style={{
            visibility: visibleStep >= 3 ? "visible" : "hidden",
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div style={{ fontSize: 24 }}>先选</div>
          <div>
            <div style={{ fontSize: 24, textAlign: "center", marginBottom: 8 }}>
              后选
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 100px)",
                gap: 5,
                fontSize: 24,
                whiteSpace: "nowrap",
              }}
            >
              <span />
              {inputs.map((input) => (
                <div key={`head-${input}`} style={{ textAlign: "center" }}>
                  <Latex colorize={false}>{String(input)}</Latex>
                </div>
              ))}
              {inputs.map((first) => (
                <div key={first} style={{ display: "contents" }}>
                  <div style={{ display: "grid", placeItems: "center" }}>
                    <Latex colorize={false}>{String(first)}</Latex>
                  </div>
                  {inputs.map((second) => {
                    const shown =
                      visibleStep >= 5 || (visibleStep >= 4 && first === 1);
                    const active = shown && state.first === first;
                    return (
                      <div
                        key={second}
                        data-choice-cell
                        style={{
                          height: 42,
                          display: "grid",
                          placeItems: "center",
                          borderRadius: 6,
                          border: `2px solid ${active ? amber : "#d7e0eb"}`,
                          background: shown
                            ? first === second
                              ? "#e2e8f0"
                              : active
                                ? tints.attention
                                : tints.input
                            : "transparent",
                        }}
                      >
                        <span
                          style={{ visibility: shown ? "visible" : "hidden" }}
                        >
                          <Latex colorize={false}>
                            {first === second
                              ? "\\times"
                              : `${first}\\to${second}`}
                          </Latex>
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  return (
    <div
      data-page-block
      data-pairing-diagram
      style={{
        visibility: visibleStep >= 1 ? "visible" : "hidden",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 26, marginBottom: 12 }}>
        {page === "unordered"
          ? "两种选择顺序，对应同一个无序输入对"
          : "四份输入：选择顺序与无序输入对"}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
        {(page === "unordered" ? [[1, 2]] : pairs).map(([first, second]) => (
          <PairMerge
            key={`${first}-${second}`}
            first={first}
            second={second}
            progress={state.merge}
          />
        ))}
      </div>
      {page === "substitution" && (
        <div
          data-enumeration
          style={{
            fontSize: 28,
            marginTop: 8,
            visibility: visibleStep >= 3 ? "visible" : "hidden",
          }}
        >
          <MathText>十二种选择顺序，两两合并为六对</MathText>
        </div>
      )}
    </div>
  );
}
