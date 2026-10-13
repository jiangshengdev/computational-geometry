import { useContext, useId, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from '@heroui/react/button'
import { Description } from '@heroui/react/description'
import { Modal } from '@heroui/react/modal'
import { Tabs } from '@heroui/react/tabs'
import { LearningIntroduction, LearningReferences, SamePointRules, VerticalRules, OverlapRules, NeighborRules, EventQueueRules, ActiveOrderRules } from './HelpContent'
import { HelpContext, type HelpTopic } from './help-context'
import { samePoint, type Preset } from '../geometry/geometry'

const topics = [
  { id: 'introduction', title: '学习目标、术语与扫描约定', content: <LearningIntroduction /> },
  { id: 'references', title: '参考资料', content: <LearningReferences /> },
  { id: 'results', title: '配对与精确详情', content: <section aria-label="配对与精确详情" className="flex flex-col gap-3">
    <h2 className="font-semibold">相交配对与精确交集</h2>
    <p>每个输入保留独立身份。配对数不是独立几何交点数；图形仅作人工辅助校验。</p>
    <p>选择一个配对，检查交集和两个输入。交集可以是点或完整重叠区间；精确详情保留有理数坐标，像素近似只用于绘图。</p>
    <p>混合结果中的点类型配对可能位于其他配对的重叠区间上，不等于整体交集中的孤立点。点结果位置数、区间配对数与全部相交配对数分别统计，不合并区间或计算几何并集。</p>
  </section> },
  { id: 'inputs', title: '原始输入', content: <section aria-label="原始输入说明" className="flex flex-col gap-3">
    <h2 className="font-semibold">独立输入与端点</h2>
    <p>每条输入保留自己的编号和两个端点。即使几何重合，也保留各自的输入身份。将指针移到输入列表或画布中的对应对象，可查看高亮联动。</p>
  </section> },
  { id: 'events', title: '事件队列', content: <EventQueueRules /> },
  { id: 'ties', title: '同点与并列规则', content: <SamePointRules /> },
  { id: 'neighbors', title: '相邻性论证', content: <NeighborRules /> },
] as const

export function CaseHelp({ children, preset }: { children: ReactNode; preset: Preset }) {
  const [open, setOpen] = useState(false)
  const [topic, setTopic] = useState<HelpTopic>('introduction')
  const descriptionId = useId()
  const availableTopics: { id: HelpTopic; title: string; content: ReactNode }[] = [...topics, { id: 'case', title: '案例介绍与目标', content: <section aria-label="案例介绍与目标" className="flex flex-col gap-3">
    <h2 className="font-semibold">{preset.name}</h2>
    <p className="coordinates">{preset.description}</p>
    {preset.learning && <p>学习目标：{preset.learning.goal}</p>}
    {!preset.learning && <p>此案例目前提供结果查看；支持教学的案例可从案例列表进入逐步学习。</p>}
  </section> }, { id: 'active', title: '活动线段顺序', content: <ActiveOrderRules overlap={Boolean(preset.learning?.overlap)} /> }]
  if (preset.segments.some(segment => samePoint({ x: segment.start.x, y: segment.end.y }, segment.end) && !samePoint(segment.start, segment.end))) {
    availableTopics.push({ id: 'vertical', title: '竖直线处理规则', content: <VerticalRules /> })
  }
  if (preset.learning?.overlap) availableTopics.push({ id: 'overlap', title: '重叠处理规则', content: <OverlapRules /> })
  const selectedTopic = availableTopics.find(item => item.id === topic) ?? availableTopics[0]
  return <HelpContext value={(next, element) => {
    // Record the actual opener in Modal's focus scope, including touch activation.
    element.focus({ preventScroll: true })
    setTopic(next)
    setOpen(true)
  }}>
    {children}
    <Modal.Backdrop isOpen={open} onOpenChange={setOpen}>
      <Modal.Container size="lg" scroll="inside">
      <Modal.Dialog aria-describedby={descriptionId} className="max-w-4xl">
        <Modal.CloseTrigger aria-label="关闭帮助"><X size={16} aria-hidden="true" /></Modal.CloseTrigger>
        <Modal.Header>
          <Modal.Heading>说明与帮助</Modal.Heading>
          <Description id={descriptionId}>按主题阅读，关闭后继续当前操作。</Description>
        </Modal.Header>
        <Modal.Body className="min-h-0 overscroll-contain">
          <Tabs orientation="vertical" align="start" selectedKey={selectedTopic.id} onSelectionChange={key => setTopic(key as HelpTopic)}
            className="grid gap-6 sm:grid-cols-[12rem_minmax(0,1fr)]">
            <Tabs.ListContainer className="min-w-0 self-start [--help-tab-radius:calc(var(--radius)*2.5-var(--spacing))]">
              <Tabs.List aria-label="帮助主题" className="w-full">
                {availableTopics.map(item => <Tabs.Tab key={item.id} id={item.id} className="h-auto min-h-8 rounded-(--help-tab-radius) whitespace-normal py-2">
                  {item.title}<Tabs.Indicator className="rounded-[inherit]" />
                </Tabs.Tab>)}
              </Tabs.List>
            </Tabs.ListContainer>
            {availableTopics.map(item => <Tabs.Panel key={item.id} id={item.id} className="m-0 min-w-0 p-0 text-sm leading-relaxed">
              {item.content}
            </Tabs.Panel>)}
          </Tabs>
        </Modal.Body>
      </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  </HelpContext>
}

export function HelpButton({ topic = 'introduction', children = '说明与帮助' }: { topic?: HelpTopic; children?: ReactNode }) {
  const showHelp = useContext(HelpContext)
  const trigger = useRef<HTMLButtonElement | null>(null)
  return <Button ref={trigger} variant="tertiary" size="sm" aria-haspopup="dialog"
    onPress={() => { if (trigger.current) showHelp(topic, trigger.current) }}>{children}</Button>
}
