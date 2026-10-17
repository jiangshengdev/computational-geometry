import { useContext, useId, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from '@heroui/react/button'
import { Description } from '@heroui/react/description'
import { Modal } from '@heroui/react/modal'
import { Tabs } from '@heroui/react/tabs'
import { LearningIntroduction, LearningReferences, SamePointRules, VerticalRules, OverlapRules, NeighborRules, EventQueueRules, ActiveOrderRules } from './HelpContent'
import { HelpContext, type HelpTopic } from './help-context'
import { samePoint } from '../../../geometry/geometry'
import { type Preset } from '../cases/preset'
import { useLingui } from '@lingui/react'
import { LanguageSelect } from '../../../app/LanguageProvider'
import { Trans, useLingui as useTranslations } from '@lingui/react/macro'

function useHelpTopics() {
  const { t } = useTranslations()
  return [
  { id: 'introduction', title: t`Learning goals, terms, and sweep conventions`, content: <LearningIntroduction /> },
  { id: 'references', title: t`References`, content: <LearningReferences /> },
  { id: 'results', title: t`Pairs and exact details`, content: <section aria-label={t`Pairs and exact details`} className="flex flex-col gap-3">
    <h2 className="font-semibold"><Trans>Intersecting pairs and exact intersections</Trans></h2>
    <p><Trans>Each input retains its own identity. The pair count is not the number of distinct geometric intersection points; the drawing is only a visual aid for manual verification.</Trans></p>
    <p><Trans>Select a pair to inspect its intersection and both inputs. An intersection can be a point or a complete overlap interval. Exact details retain rational coordinates; pixel approximations are used only for drawing.</Trans></p>
    <p><Trans>In mixed results, point-type pairs may lie on other pairs’ overlap intervals, so they are not necessarily isolated points of the overall intersection. Distinct point-result positions, interval pairs, and all intersecting pairs are counted separately, without merging intervals or computing a geometric union.</Trans></p>
  </section> },
  { id: 'inputs', title: t`Original inputs`, content: <section aria-label={t`Original input explanation`} className="flex flex-col gap-3">
    <h2 className="font-semibold"><Trans>Distinct inputs and endpoints</Trans></h2>
    <p><Trans>Each input retains its own ID and two endpoints. Even geometrically coincident inputs keep their separate identities. Hover over an input in the list or its corresponding canvas object to see linked highlighting.</Trans></p>
  </section> },
  { id: 'events', title: t`Event queue`, content: <EventQueueRules /> },
  { id: 'ties', title: t`Same-point and tie rules`, content: <SamePointRules /> },
  { id: 'neighbors', title: t`Adjacency argument`, content: <NeighborRules /> },
] as const
}

export function CaseHelp({ children, preset }: { children: ReactNode; preset: Preset }) {
  const { _: translate } = useLingui()
  const { t } = useTranslations()
  const topics = useHelpTopics()
  const [open, setOpen] = useState(false)
  const [topic, setTopic] = useState<HelpTopic>('introduction')
  const descriptionId = useId()
  const goal = preset.learning ? translate(preset.learning.goal) : ''
  const availableTopics: { id: HelpTopic; title: string; content: ReactNode }[] = [...topics, { id: 'case', title: t`Case introduction and goals`, content: <section aria-label={t`Case introduction and goals`} className="flex flex-col gap-3">
    <h2 className="font-semibold">{translate(preset.name)}</h2>
    <p className="coordinates">{translate(preset.description)}</p>
    {preset.learning && <p><Trans id="help.case.goal">Learning goal: {goal}</Trans></p>}
    {!preset.learning && <p><Trans>This case currently provides result viewing. Open a teaching case from the case list for step-by-step learning.</Trans></p>}
  </section> }, { id: 'active', title: t`Active segment order`, content: <ActiveOrderRules overlap={Boolean(preset.learning?.overlap)} /> }]
  if (preset.segments.some(segment => samePoint({ x: segment.start.x, y: segment.end.y }, segment.end) && !samePoint(segment.start, segment.end))) {
    availableTopics.push({ id: 'vertical', title: t`Vertical segment rules`, content: <VerticalRules /> })
  }
  if (preset.learning?.overlap) availableTopics.push({ id: 'overlap', title: t`Overlap rules`, content: <OverlapRules /> })
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
        <Modal.CloseTrigger aria-label={t`Close help`}><X size={16} aria-hidden="true" /></Modal.CloseTrigger>
        <Modal.Header>
          <Modal.Heading><Trans>About and help</Trans></Modal.Heading>
          <LanguageSelect />
          <Description id={descriptionId}><Trans>Read by topic, then close to continue your current task.</Trans></Description>
        </Modal.Header>
        <Modal.Body className="min-h-0 overscroll-contain">
          <Tabs orientation="vertical" align="start" selectedKey={selectedTopic.id} onSelectionChange={key => setTopic(key as HelpTopic)}
            className="grid gap-6 sm:grid-cols-[12rem_minmax(0,1fr)]">
            <Tabs.ListContainer className="min-w-0 self-start [--help-tab-radius:calc(var(--radius)*2.5-var(--spacing))]">
              <Tabs.List aria-label={t`Help topics`} className="w-full">
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

export function HelpButton({ topic = 'introduction', children = <Trans>About and help</Trans> }: { topic?: HelpTopic; children?: ReactNode }) {
  const showHelp = useContext(HelpContext)
  const trigger = useRef<HTMLButtonElement | null>(null)
  return <Button ref={trigger} variant="tertiary" size="sm" aria-haspopup="dialog"
    onPress={() => { if (trigger.current) showHelp(topic, trigger.current) }}>{children}</Button>
}
