import type { ReactNode } from "react";

/** Previously taught sources remain available while the current proof advances. */
export function TeachingReferences({
  entries,
  activeColor,
}: {
  entries: {
    id: string;
    label: ReactNode;
    content: ReactNode;
    active: boolean;
    visible?: boolean;
  }[];
  activeColor: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "10px 32px",
        width: 1660,
      }}
    >
      {entries.map(({ id, label, content, active, visible = true }) => (
        <div
          key={id}
          data-reference={id}
          data-reference-active={visible && active}
          style={{
            fontSize: 25,
            lineHeight: 1.6,
            visibility: visible ? "visible" : "hidden",
          }}
        >
          <span style={{ background: active ? activeColor : undefined }}>
            {label}
          </span>
          {content}
        </div>
      ))}
    </div>
  );
}
