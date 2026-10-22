import { AbsoluteFill } from "remotion";
import { Latex } from "./Latex";

export const LatexPreview = () => (
  <AbsoluteFill
    style={{
      backgroundColor: "#f6f8fb",
      color: "#172c45",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: '"PingFang SC", sans-serif',
      fontSize: 48,
      gap: 24,
    }}
  >
    <div>
      直线方程：<Latex>{String.raw`aX + bY = c`}</Latex>
    </div>
    <Latex displayMode>
      {String.raw`\frac{Y-Y_1}{Y_2-Y_1}=\frac{X-X_1}{X_2-X_1}`}
    </Latex>
    <div style={{ fontSize: 28 }}>适用条件：两个分母均不为零</div>
    <Latex displayMode style={{ color: "#2563eb" }}>
      {String.raw`\begin{cases}a=Y_2-Y_1\\b=X_1-X_2\\c=aX_1+bY_1\end{cases}`}
    </Latex>
  </AbsoluteFill>
);
