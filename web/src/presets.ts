import { segment, type Preset } from './geometry'

export const presets: Preset[] = [
  { id: 'crossing', name: '普通交叉', description: '两条对角线相交于 (2, 2)。', segments: [segment('0', '0', '4', '4'), segment('0', '4', '4', '0')] },
  { id: 'disjoint', name: '无交点', description: '两条平行线段，没有相交配对。', segments: [segment('0', '0', '4', '0'), segment('0', '2', '4', '2')] },
  { id: 'empty', name: '空集合', description: '没有输入线段，合法计算返回空结果。', segments: [] },
  { id: 'single', name: '单条输入', description: '只有一条线段，不形成输入配对。', segments: [segment('-2', '-1', '3', '2')] },
]
