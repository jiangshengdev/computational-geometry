import type { SweepStep } from '../src/geometry'

interface LayoutState {
  reason: string
  matches: (step: SweepStep, index: number, steps: SweepStep[]) => boolean
  text: RegExp
}

const completed: LayoutState = {
  reason: '最终结果：空队列、空活动列表、结果明细和独立数学核对',
  matches: (_, index, steps) => index === steps.length - 1,
  text: /学习完成/,
}

// Select by the content rendered by LearningView, never by a sampling interval.
// This replaces the old all-preset/all-step matrix, not its interaction tests.
// Unselected intermediate steps no longer receive individual layout checks.
export const layoutCases: { id: string; states: LayoutState[] }[] = [
  {
    id: 'crossing',
    // One example of each ordinary explanation and empty/nonempty state panel.
    states: [
      ...Object.entries({
        initial: /先把所有端点放入事件队列/,
        take: /从队首取出/,
        insert: /加入 S/,
        check: /加入 S1 后/,
        discover: /发现未来交点/,
        record: /在这里交叉/,
        reorder: /换序为/,
        remove: /退出 S/,
        complete: /本事件的教学动作已完成/,
      }).map(([action, text]) => ({
        reason: `普通交叉的 ${action} 说明与列表状态`,
        matches: (step: SweepStep) => step.action === action,
        text,
      })),
      completed,
    ],
  },
  {
    id: 'neighbor-removal',
    states: [{
      reason: '删除中间线段后的邻居说明，文字结构不同于插入',
      matches: step => step.action === 'check' && step.subjects.includes(0) && step.subjects.includes(2),
      text: /退出 S1 后/,
    }],
  },
  {
    id: 'neighbor-crossing',
    states: [{
      reason: '交叉换序后的外侧邻居说明',
      matches: step => step.action === 'check' && step.subjects.includes(0) && step.subjects.includes(2),
      text: /换序后，这一对处在换序区间的外侧边界/,
    }],
  },
  {
    id: 'multiway-endpoints',
    // Also represents endpoint/start-interior/end-interior and multiway-interior
    // layout categories: contact text, grouped participants and paired results.
    states: [
      { reason: '接触记录与同点多配对的附加说明', matches: step => step.action === 'record' && !step.subjects.every(id => step.passes.includes(id)), text: /在这里接触.*同一个几何点/ },
      { reason: '开始者与多个穿过者一起加入的长说明', matches: step => step.action === 'insert' && step.passes.length > 1, text: /开始者与穿过者一起排成/ },
      { reason: '有非零长度开始者时换序不再交换的附加说明', matches: step => step.action === 'reorder' && step.starts.some(id => !step.ends.includes(id)), text: /本点有非零长度开始者/ },
      completed,
    ],
  },
  {
    id: 'vertical',
    // Multiple point rows also represent same-x; the shear-specific help button
    // adds a distinct wrapping condition to the explanation header.
    states: [
      { reason: '竖直说明按钮和准备状态', matches: step => step.action === 'initial', text: /竖直线说明/ },
      completed,
    ],
  },
  {
    id: 'partial-overlap',
    states: [
      { reason: '重叠说明按钮与带起止界标签的事件队列', matches: step => step.action === 'initial', text: /重叠说明/ },
      { reason: '完整重叠区间的长记录说明', matches: step => step.action === 'record', text: /记录重叠区间/ },
      { reason: '重叠止界退出的附加说明', matches: step => step.action === 'remove' && step.subjects.includes(0), text: /此处是重叠止界/ },
      completed,
    ],
  },
  {
    id: 'disjoint',
    states: [
      { reason: '检查后没有未来交点的完成说明', matches: (step, index, steps) => step.action === 'complete' && steps[index - 1]?.action === 'check', text: /没有需要加入队列的未来交点/ },
      { ...completed, reason: '无交点完成页的空结果说明', text: /结果为空/ },
    ],
  },
  {
    id: 'spider-web',
    states: [
      { reason: '真实网格端点构成的长队列和多输入标签', matches: step => step.action === 'initial', text: /先把所有端点/ },
      { reason: '加入后达到该案例最长活动列表', matches: (step, _, steps) => step.action === 'insert' && step.active.length === Math.max(...steps.map(state => state.active.length)), text: /加入 S/ },
      { reason: '八线中心事件的长参与者与接触说明', matches: step => step.action === 'record' && step.starts.length + step.ends.length + step.passes.length === 8, text: /同一个几何点/ },
      completed,
    ],
  },
  {
    id: 'hexagonal-snowflake',
    states: [
      { reason: '分数坐标和共端点名称的换行', matches: step => step.action === 'take' && step.current !== null && [step.current.x, step.current.y].some(value => value.denominator !== '1'), text: /从队首取出/ },
      { ...completed, reason: '真实分数坐标、87 对结果及长数学核对说明', text: /相交线段对：87/ },
    ],
  },
]
