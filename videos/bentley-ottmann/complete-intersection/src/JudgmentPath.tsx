import { MathText } from "./MathText";
import { pathObjectMarks, pathFocusMarks } from "./teaching-colors";
const nodes = [
  [
    "辨认两份输入",
    "两份都是点 → 比较位置",
    "恰好一份为点 → 共线且在闭范围内",
    "条件满足：点；否则：空",
  ],
  [
    "两份都非点 → 求 Δ",
    "Δ≠0 → 唯一候选 P → 两份闭范围",
    "都通过：点 P；否则：空",
    "Δ=0 → 端点代入：不成立为空，成立则共线",
  ],
  [
    "共线 → 从原端点选 L、R",
    "L 在 R 后：空；同点：点 L",
    "L 在 R 前：完整非零长度闭区间",
  ],
];
export function JudgmentPath({
  step,
  activeCaption,
}: {
  step: number;
  activeCaption: number | null;
}) {
  return (
    <div
      data-judgment-path
      style={{ width: 800, fontSize: 29, lineHeight: 1.7 }}
    >
      {nodes.slice(0, step).map((group, i) => (
        <div
          key={i}
          data-path-level={i + 1}
          style={{
            borderLeft: "3px solid #94a3b8",
            paddingLeft: 20,
            marginBottom: 16,
          }}
        >
          {group.map((text, j) => (
            <div key={j}>
              <MathText
                marks={[
                  ...pathObjectMarks[i],
                  ...(i === step - 1 && activeCaption !== null
                    ? (pathFocusMarks[i][activeCaption] ?? [])
                    : []),
                ]}
              >
                {text}
              </MathText>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
