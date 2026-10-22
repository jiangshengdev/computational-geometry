import { useMemo } from "react";
import { renderToString } from "katex";
import "katex/dist/katex.min.css";
import { Diagram } from "./Diagram";
import { pages, type Shot } from "./storyboard";

const Formula = ({ text }: { text: string }) => {
  const html = useMemo(
    () =>
      renderToString(text, {
        throwOnError: true,
        strict: "error",
        trust: false,
      }),
    [text],
  );
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};

export const TeachingPage = ({
  shot,
  progress,
  thinking = false,
  caption = shot.caption,
}: {
  shot: Shot;
  progress: number;
  thinking?: boolean;
  caption?: string;
}) => {
  const page = pages[shot.page];
  return (
    <div
      data-production-page
      style={{
        position: "absolute",
        inset: 0,
        background: "#f6f8fb",
        color: "#172c45",
        fontFamily: '"PingFang SC", sans-serif',
      }}
    >
      <div
        data-page-block
        style={{
          position: "absolute",
          left: 90,
          top: 42,
          fontSize: 48,
          fontWeight: 600,
        }}
      >
        {page.title}
      </div>
      <div
        data-page-block
        style={{
          position: "absolute",
          left: 90,
          top: 128,
          fontSize: 29,
          color: "#526579",
        }}
      >
        {page.mode}
      </div>
      <div style={{ position: "absolute", left: 35, top: 190 }}>
        <Diagram
          kind={page.diagram}
          step={
            shot.page === "inverse" || shot.page === "oblique" ? 6 : shot.step
          }
          progress={progress}
        />
      </div>
      <div
        data-main-content
        style={{
          position: "absolute",
          left: 920,
          top: 235,
          width: 900,
          height: 570,
        }}
      >
        {page.lines.map((line, index) => (
          <div
            key={index}
            data-content-line
            style={{
              minHeight: page.rowHeight ?? 116,
              display: "flex",
              alignItems: "center",
              visibility: index < shot.step ? "visible" : "hidden",
              color: index === shot.step - 1 ? "#176ba0" : "#172c45",
              fontSize: line.math ? 42 : 36,
              whiteSpace: "nowrap",
            }}
          >
            <span data-line-ink>
              {line.math ? <Formula text={line.math} /> : line.text}
            </span>
          </div>
        ))}
      </div>
      <div
        data-page-block
        style={{
          position: "absolute",
          left: 90,
          top: 895,
          width: 1730,
          fontSize: 28,
          color: "#526579",
        }}
      >
        {thinking ? "请独立思考 · 答案将在 4 秒思考窗口结束后出现" : page.note}
      </div>
      <div
        data-page-block
        style={{
          position: "absolute",
          left: 90,
          top: 982,
          width: 1740,
          textAlign: "center",
          fontSize: 32,
          lineHeight: 1.5,
        }}
      >
        {caption}
      </div>
    </div>
  );
};
