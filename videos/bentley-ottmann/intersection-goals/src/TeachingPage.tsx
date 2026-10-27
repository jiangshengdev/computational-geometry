import { Subtitles } from "../../../shared/ui/Subtitles";
import { MathText } from "./MathText";
import { InputDiagram } from "./InputDiagram";

export function TeachingPage({
  visibleStep,
  caption,
}: {
  visibleStep: number;
  caption: string;
}) {
  return (
    <div
      data-production-page
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
          top: 40,
          left: 100,
          fontSize: 48,
          fontWeight: 600,
        }}
      >
        三份输入，一个相交位置
      </header>
      <main
        data-main-content
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 180,
          bottom: 170,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {[1, 2, 3].map((input) => (
            <section
              key={input}
              data-page-block
              style={{
                visibility: visibleStep >= input ? "visible" : "hidden",
                width: 390,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 36 }}>
                <MathText>{`输入 ${input}`}</MathText>
              </div>
              <InputDiagram inputs={[input]} />
              <div style={{ fontSize: 28 }}>
                {input === 1
                  ? "水平线段"
                  : input === 2
                    ? "竖直线段"
                    : "两个端点相同，只有原点"}
              </div>
            </section>
          ))}
          <section
            data-page-block
            style={{
              visibility: visibleStep >= 4 ? "visible" : "hidden",
              width: 390,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 36 }}>放在一起</div>
            <InputDiagram inputs={[1, 2, 3]} />
            <div style={{ fontSize: 28 }}>保留三份输入的身份</div>
          </section>
        </div>
        <div
          data-page-block
          style={{
            visibility: visibleStep >= 4 ? "visible" : "hidden",
            marginTop: 80,
            textAlign: "center",
            fontSize: 46,
            color: "#b45309",
          }}
        >
          求交结果应该记几条？
        </div>
      </main>
      <Subtitles pageBlock>
        <span data-caption-ink>
          <MathText>{caption}</MathText>
        </span>
      </Subtitles>
    </div>
  );
}
