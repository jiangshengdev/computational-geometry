import { useContext, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { LearningIntroduction, LearningReferences } from './HelpContent'
import { HelpContext, type HelpTopic } from './help-context'

const topics = [
  { id: 'introduction', title: '学习目标、术语与扫描约定', content: <LearningIntroduction /> },
  { id: 'references', title: '参考资料', content: <LearningReferences /> },
] as const

export function CaseHelp({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [topic, setTopic] = useState<HelpTopic>('introduction')
  const trigger = useRef<HTMLButtonElement | null>(null)
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
            {topics.map(item => <ToggleGroupItem key={item.id} value={item.id}>{item.title}</ToggleGroupItem>)}
          </ToggleGroup>
          <div key={topic} className="flex flex-col gap-3 text-sm leading-relaxed">
            {topics.find(item => item.id === topic)?.content}
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
