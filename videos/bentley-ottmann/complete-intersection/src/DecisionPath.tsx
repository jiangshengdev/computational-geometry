import { MathText } from "./MathText";

const branches = [
  ["两份都是点", "比较两个坐标是否分别相等", "相等：该点；否则：空"],
  ["恰好一份是点", "共线，且通过非点输入的闭范围", "都通过：该点；否则：空"],
  [
    "两份非点，$\\Delta\\ne0$",
    "唯一候选点通过两份闭范围",
    "都通过：候选点；否则：空",
  ],
  [
    "两份非点，$\\Delta=0$",
    "将 $A_2$ 代入第一条直线",
    "不成立：空；成立：共线 ↓",
  ],
  [
    "共线：选出边界 $L,R$",
    "比较共同直线上的前、同点、后",
    "前：完整区间；同点：点；后：空",
  ],
];

/** The complete path is assembled only after all branches have been taught. */
export function DecisionPath({ step }: { step: number }) {
  const visible = step === 1 ? 2 : step === 2 ? 3 : 5;
  return (
    <div data-teaching-group="complete-path" style={{ width: 1660 }}>
      <div style={{ textAlign: "center", fontSize: 34, marginBottom: 26 }}>
        四个给定端点 → 先辨认点输入 → 沿满足的条件继续
      </div>
      {branches.map((branch, index) => (
        <div
          key={index}
          data-path-branch={index}
          style={{
            visibility: index < visible ? "visible" : "hidden",
            display: "grid",
            gridTemplateColumns: "400px 45px 550px 45px 620px",
            alignItems: "center",
            minHeight: 105,
            fontSize: 29,
          }}
        >
          {branch.map((label, column) => (
            <div
              key={column}
              style={{
                gridColumn: column * 2 + 1,
                position: "relative",
                border: "1px solid #94a3b8",
                padding: "14px 18px",
                borderRadius: 8,
                background: "#edf1f6",
              }}
            >
              {column > 0 ? (
                <span aria-hidden style={{ position: "absolute", left: -35 }}>
                  →
                </span>
              ) : null}
              <MathText>{label}</MathText>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
