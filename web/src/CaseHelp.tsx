import { useContext, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { LearningIntroduction, LearningReferences } from './HelpContent'
import { HelpContext, type HelpTopic } from './help-context'
import type { Preset } from './geometry'

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
] as const

export function CaseHelp({ children, preset }: { children: ReactNode; preset: Preset }) {
  const [open, setOpen] = useState(false)
  const [topic, setTopic] = useState<HelpTopic>('introduction')
  const trigger = useRef<HTMLButtonElement | null>(null)
  const availableTopics = [...topics, { id: 'case', title: '案例介绍与目标', content: <section aria-label="案例介绍与目标" className="flex flex-col gap-3">
    <h2 className="font-semibold">{preset.name}</h2>
    <p className="coordinates">{preset.description}</p>
    {preset.learning && <p>学习目标：{preset.learning.goal}</p>}
    {!preset.learning && <p>此案例目前提供结果查看；支持教学的案例可从案例列表进入逐步学习。</p>}
  </section> }]
  return <HelpContext value={(next, element) => { trigger.current = element; setTopic(next); setOpen(true) }}>
    {children}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-3xl" showCloseButton={false}
        onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus() }}>
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle>说明与帮助</DialogTitle>
            <DialogClose asChild><Button variant="outline" size="sm">关闭帮助</Button></DialogClose>
          </div>
          <DialogDescription>按主题阅读，关闭后继续当前操作。</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto overscroll-contain">
          <ToggleGroup type="single" value={topic} onValueChange={value => { if (value) setTopic(value as HelpTopic) }}
            className="mb-5 flex-wrap justify-start" aria-label="帮助主题">
            {availableTopics.map(item => <ToggleGroupItem key={item.id} value={item.id}>{item.title}</ToggleGroupItem>)}
          </ToggleGroup>
          <div key={topic} className="flex flex-col gap-3 text-sm leading-relaxed">
            {availableTopics.find(item => item.id === topic)?.content}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </HelpContext>
}

export function HelpButton({ topic = 'introduction', children = '说明与帮助' }: { topic?: HelpTopic; children?: ReactNode }) {
  const showHelp = useContext(HelpContext)
  return <Button variant="outline" size="sm" onClick={event => showHelp(topic, event.currentTarget)}>{children}</Button>
}
