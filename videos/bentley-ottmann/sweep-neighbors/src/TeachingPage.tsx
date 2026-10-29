import { Subtitles } from "../../../shared/ui/Subtitles";
import { LessonPage } from "../../../shared/ui/LessonPage";
import type { TeachingFocus } from "../../../shared/speech/teaching-cues";
import { MathText } from "./MathText";
import { SweepDiagram } from "./SweepDiagram";
import { pages, type Shot } from "./storyboard";
import { states, inputs, intersections } from "./sweep-state";
export function TeachingPage({
  shot,
  caption,
  focus,
  visibleStep,
  stateName,
}: {
  shot: Shot;
  caption: string;
  focus?: TeachingFocus;
  visibleStep: number;
  stateName: string;
}) {
  const page = pages[shot.page];
  let state = states[stateName];
  if (shot.id === "S11" && stateName === "activeIntro") {
    const progress =
      focus?.name === "intro-scan"
        ? focus.progress
        : focus?.reached.includes("intro-scan")
          ? 1
          : 0;
    const x = -0.6 + 3.1 * progress;
    state = {
      ...state,
      x,
      order: state.shown.filter(
        (id) => inputs[id].from[0] <= x && x < inputs[id].to[0],
      ),
    };
  }
  if (shot.state === "blank")
    return (
      <LessonPage
        title={<MathText>{page.title}</MathText>}
        lines={page.lines.map((l) => (
          <MathText key={l}>{l}</MathText>
        ))}
        visibleStep={visibleStep}
        activeStep={visibleStep}
        caption={<MathText>{caption}</MathText>}
      />
    );
  const emphasis = (key: string) =>
    focus?.active && focus.keys?.includes(key)
      ? "rgba(180,83,9,0.12)"
      : "transparent";
  const order = (ids: typeof state.order) =>
    ids.length
      ? ids.map((id, i) => (
          <span key={id} style={{ color: inputs[id].color }}>
            <MathText>{`${i ? ", " : ""}${id}`}</MathText>
          </span>
        ))
      : "空";
  return (
    <div
      data-production-page
      data-state={stateName}
      style={{
        position: "absolute",
        inset: 0,
        background: "#f6f8fb",
        color: "#172c45",
        fontFamily: '"PingFang SC",sans-serif',
      }}
    >
      <header
        data-page-block
        style={{
          position: "absolute",
          left: 85,
          top: 35,
          fontSize: 46,
          fontWeight: 600,
        }}
      >
        <MathText>{page.title}</MathText>
      </header>
      <main
        data-main-content
        style={{
          position: "absolute",
          left: 70,
          right: 70,
          top: 120,
          bottom: 145,
          display: "grid",
          gridTemplateColumns: "900px 790px",
          gridTemplateRows: "680px 100px",
          gap: "12px 70px",
          alignContent: "center",
        }}
      >
        <section
          data-page-block
          style={{
            width: 900,
            height: 680,
          }}
        >
          <SweepDiagram state={state} focus={focus} />
        </section>
        <section
          data-main-column
          style={{
            width: 790,
            alignSelf: "center",
            display: "grid",
            gridTemplateRows: "180px 240px 190px",
            gap: 15,
            fontSize: 28,
            lineHeight: 1.5,
          }}
        >
          <div
            data-page-block
            style={{
              visibility: state.records >= 1 ? "visible" : "hidden",
              background: emphasis("order"),
            }}
          >
            <div style={{ fontSize: 30, fontWeight: 600 }}>
              活动顺序 · 从下到上
            </div>
            <div style={{ fontSize: 23 }}>
              <MathText>
                {state.definition ? "定义示意，尚未执行扫描" : state.stage}
              </MathText>
            </div>
            <div
              data-order-before
              style={{ visibility: state.definition ? "hidden" : undefined }}
            >
              处理前：{order(state.before)}
            </div>
            <div data-order-after>
              {state.definition ? "当前顺序：" : "当前记录："}
              {order(state.order)}
            </div>
          </div>
          <div
            data-page-block
            style={{
              visibility: state.records >= 2 ? "visible" : "hidden",
              background: emphasis("queue"),
            }}
          >
            <div style={{ fontSize: 30, fontWeight: 600 }}>
              待处理清单 · 按位置
            </div>
            <div
              data-event-queue
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "2px 24px",
              }}
            >
              {state.queue.length
                ? state.queue.map((e) => (
                    <div
                      key={e.x}
                      data-event-x={e.x}
                      style={{ background: emphasis(e.point ?? "") }}
                    >
                      <MathText>{`${e.x}：${e.label}`}</MathText>
                    </div>
                  ))
                : "空"}
            </div>
          </div>
          <div
            data-page-block
            style={{
              visibility: state.records >= 3 ? "visible" : "hidden",
              background: emphasis("results"),
            }}
          >
            <div style={{ fontSize: 30, fontWeight: 600 }}>
              已报告结果 · 原始无序输入对
            </div>
            <div data-results>
              {state.reported.length
                ? state.reported.map((id) => (
                    <div key={id} data-result={id}>
                      <MathText>{`${intersections[id].pair.join(" 与 ")}：${id}=(${intersections[id].at.join(",")})`}</MathText>
                    </div>
                  ))
                : "空（尚未到达交点）"}
            </div>
          </div>
        </section>
        <section
          data-main-column
          style={{
            gridColumn: "1 / -1",
            marginLeft: 15,
            marginRight: 5,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gridTemplateRows: "repeat(2, 45px)",
            gap: "10px 30px",
          }}
        >
          {page.lines.map((line, i) => (
            <div
              key={line}
              data-content-line
              style={{
                visibility: i < visibleStep ? "visible" : "hidden",
                fontSize: 28,
                lineHeight: 1.6,
                paddingLeft: 14,
                borderLeft: `4px solid ${i + 1 === visibleStep ? "#b45309" : "transparent"}`,
              }}
            >
              <span data-line-ink>
                <MathText>{line}</MathText>
              </span>
            </div>
          ))}
        </section>
      </main>
      <Subtitles pageBlock>
        <span data-caption-ink>
          <MathText>{caption}</MathText>
        </span>
      </Subtitles>
    </div>
  );
}
