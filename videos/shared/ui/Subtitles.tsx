import type { CSSProperties, ReactNode } from "react";
export function Subtitles({
  children,
  pageBlock,
  style,
}: {
  children: ReactNode;
  pageBlock?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      data-page-block={pageBlock || undefined}
      data-subtitle
      style={{
        position: "absolute",
        left: 120,
        right: 120,
        bottom: 30,
        height: 68,
        boxSizing: "content-box",
        borderTop: "2px solid #dce4ec",
        paddingTop: 20,
        fontSize: 40,
        lineHeight: 1.4,
        textAlign: "center",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
