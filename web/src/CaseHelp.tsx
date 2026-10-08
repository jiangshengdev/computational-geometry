import { useContext, useId, useRef, useState, type ReactNode } from 'react'
import { Button } from '@heroui/react/button'
import { Label } from '@heroui/react/label'
import { Modal } from '@heroui/react/modal'
import { Radio } from '@heroui/react/radio'
import { RadioGroup } from '@heroui/react/radio-group'
import { LearningIntroduction, LearningReferences, SamePointRules, VerticalRules, OverlapRules, NeighborRules, EventQueueRules, ActiveOrderRules } from './HelpContent'
import { HelpContext, type HelpTopic } from './help-context'
import { samePoint, type Preset } from './geometry'

const topics = [
  { id: 'introduction', title: '学习目标、术语与扫描约定', content: <LearningIntroduction /> },
  { id: 'references', title: '参考资料', content: <LearningReferences /> },
  { id: 'results', title: '配对与精确详情', content: <section aria-label="配对与精确详情" className="flex flex-col gap-3">
    <h2 className="font-semibold">相交配对与精确交集</h2>
    <p>每个输入保留独立身份。配对数不是独立几何交点数；图形仅作人工辅助校验。</p>
    <p>选择一个配对，检查交集和两个输入。交集可以是点或完整重叠区间；精确详情保留有理数坐标，像素近似只用于绘图。</p>
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
  </section> }, { id: 'active', title: '活动线段顺序', content: <ActiveOrderRules overlap={preset.id === 'partial-overlap'} /> }]
  if (preset.segments.some(segment => samePoint({ x: segment.start.x, y: segment.end.y }, segment.end) && !samePoint(segment.start, segment.end))) {
    availableTopics.push({ id: 'vertical', title: '竖直线处理规则', content: <VerticalRules /> })
  }
  if (preset.id === 'partial-overlap') availableTopics.push({ id: 'overlap', title: '重叠处理规则', content: <OverlapRules /> })
  return <HelpContext value={(next, element) => {
    // Record the actual opener in Modal's focus scope, including touch activation.
    element.focus({ preventScroll: true })
    setTopic(next)
    setOpen(true)
  }}>
    {children}
    <Modal.Backdrop isOpen={open} onOpenChange={setOpen}>
      <Modal.Container size="lg" scroll="inside">
      <Modal.Dialog className="max-h-[90dvh]" aria-describedby={descriptionId}>
        <Modal.Header>
          <div className="flex items-center justify-between gap-3">
            <Modal.Heading>说明与帮助</Modal.Heading>
            <Button slot="close" variant="outline" size="sm">关闭帮助</Button>
          </div>
          <p id={descriptionId} className="text-sm text-muted">按主题阅读，关闭后继续当前操作。</p>
        </Modal.Header>
        <Modal.Body className="min-h-0 overscroll-contain">
          <RadioGroup value={topic} onChange={value => setTopic(value as HelpTopic)} orientation="horizontal"
            className="mb-5 flex flex-row flex-wrap gap-3" aria-label="帮助主题">
            {availableTopics.map(item => <Radio key={item.id} value={item.id}>
              <Radio.Content className="min-h-10">
                <Radio.Control><Radio.Indicator /></Radio.Control>
                <Label>{item.title}</Label>
              </Radio.Content>
            </Radio>)}
          </RadioGroup>
          <div key={topic} className="flex flex-col gap-3 text-sm leading-relaxed">
            {availableTopics.find(item => item.id === topic)?.content}
          </div>
        </Modal.Body>
      </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  </HelpContext>
}

export function HelpButton({ topic = 'introduction', children = '说明与帮助' }: { topic?: HelpTopic; children?: ReactNode }) {
  const showHelp = useContext(HelpContext)
  const trigger = useRef<HTMLButtonElement | null>(null)
  return <Button ref={trigger} variant="outline" size="sm" aria-haspopup="dialog"
    onPress={() => { if (trigger.current) showHelp(topic, trigger.current) }}>{children}</Button>
}
