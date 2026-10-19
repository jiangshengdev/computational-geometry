# SVG 描边与 Safari 渲染

- 已知 Safari 的 SVG `vector-effect: non-scaling-stroke` 曾导致悬停更新后旧描边像素残留，表现为毛刺、杂边或重影；交互状态已清除不代表画面已正确重绘。
- 新增或修改可缩放 SVG 绘图时，不使用 `vector-effect: non-scaling-stroke`（包括 JSX 的 `vectorEffect="non-scaling-stroke"`）。需要保持屏幕描边宽度时，复用现有视口缩放比例 k，将描边宽度设为原始宽度 / k；虚线长度和间隔同样补偿。
- 此规则覆盖 circle、line、path、polygon、polyline、text，以及普通、悬停、选中、教学高亮等状态，不得只处理圆点。仅对实际经过缩放变换的图层补偿；屏幕坐标图层和未缩放图标不得重复补偿。
- 修改前检查公共样式、组件属性和相关调用方，避免局部修复后由其他规则重新引入该属性。不得用强制重绘、反复挂载或无依据修改交互状态来掩盖描边残留。
- 相似症状不能直接视为同一根因；功能测试通过不能证明 Safari 像素残留已消失。未进行实际视觉验证时，明确说明验证边界。
