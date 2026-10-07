import { segment, type Preset } from './geometry'

export const presets: Preset[] = [
  { id: 'crossing', name: '普通交叉', description: '两条对角线相交于 (2, 2)。', segments: [segment('0', '0', '4', '4'), segment('0', '4', '4', '0')] },
  { id: 'disjoint', name: '无交点', description: '两条平行线段，没有相交配对。', segments: [segment('0', '0', '4', '0'), segment('0', '2', '4', '2')] },
  { id: 'empty', name: '空集合', description: '没有输入线段，合法计算返回空结果。', segments: [] },
  { id: 'single', name: '单条输入', description: '只有一条线段，不形成输入配对。', segments: [segment('-2', '-1', '3', '2')] },
  { id: 'endpoint', name: '共端点', description: '闭线段在共同端点接触。', segments: [segment('0', '0', '2', '0'), segment('2', '0', '3', '1')] },
  { id: 'interior', name: '端点落在内部', description: '竖直线段的端点落在水平线段内部。', segments: [segment('0', '0', '4', '0'), segment('2', '0', '2', '2')] },
  { id: 'multiway', name: '三线共点', description: '同一个几何点对应三个独立配对。', segments: [segment('-2', '0', '2', '0'), segment('0', '-2', '0', '2'), segment('-2', '-2', '2', '2')] },
  { id: 'vertical', name: '竖直线多高度接触', description: '同一竖直线在不同高度交叉，并在顶端接触。', segments: [segment('0', '-2', '0', '3'), segment('-2', '-1', '2', '-1'), segment('-1', '1', '1', '1'), segment('0', '3', '2', '3')] },
  { id: 'same-x', name: '同扫描坐标不同交点', description: '两个独立交叉拥有相同横坐标。', segments: [segment('-1', '-2', '1', '0'), segment('-1', '0', '1', '-2'), segment('-1', '2', '1', '4'), segment('-1', '4', '1', '2')] },
  { id: 'fraction-contact', name: '分数端点与内部交叉', description: '第三条线从 (1/2, 1/2) 出发，与两条对角线同时相交。', segments: [segment('0', '0', '1', '1'), segment('0', '1', '1', '0'), segment('1/2', '1/2', '3/2', '1/2')] },
  { id: 'point-inputs', name: '零长度点与线段', description: '内部点、端点、外部点和重合点均保留独立输入身份。', segments: [segment('0', '0', '4', '0'), segment('2', '0', '2', '0'), segment('0', '0', '0', '0'), segment('5', '1', '5', '1'), segment('2', '0', '2', '0')] },
  { id: 'pure-points', name: '纯点集合', description: '两个重合分数点和一个分离点。', segments: [segment('1/3', '2/3', '1/3', '2/3'), segment('1/3', '2/3', '1/3', '2/3'), segment('2/3', '1/3', '2/3', '1/3')] },
  { id: 'point-multiway', name: '零长度点与多线共点', description: '三条线和一个点同处原点，六个配对分别可查。', segments: [segment('-2', '0', '2', '0'), segment('0', '-2', '0', '2'), segment('-2', '-2', '2', '2'), segment('0', '0', '0', '0')] },
]
