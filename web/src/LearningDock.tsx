import { useId, useState, type ReactNode } from 'react'
import { ChevronsLeft, ChevronsRight, type LucideIcon } from 'lucide-react'
import { Button } from '@heroui/react/button'
import { Modal } from '@heroui/react/modal'
import { useLayoutPreference } from './useLayoutPreference'
import './LearningDock.css'

interface DockPanel { id: string; name: string; icon: LucideIcon; content: ReactNode }

export function LearningDock({ side, panels }: { side: 'left' | 'right'; panels: DockPanel[] }) {
  const [expanded, setExpanded] = useLayoutPreference(`bo-learning-layout-v1-${side}`, false,
    (value): value is boolean => typeof value === 'boolean')
  const [opened, setOpened] = useState<string | null>(null)
  const id = useId()
  const label = `${side === 'left' ? '左' : '右'}侧辅助栏`

  return <aside aria-label={label} className={`learning-dock learning-dock-${side}`} data-expanded={expanded}>
    <div className="learning-dock-controls">
      <Button type="button" variant="tertiary" isIconOnly={!expanded} aria-label={`${expanded ? '收起' : '展开'}${label}`}
        aria-expanded={expanded} aria-controls={id}
        onPress={() => { setOpened(null); setExpanded(!expanded) }}>
        {expanded === (side === 'left') ? <ChevronsLeft size={20} aria-hidden="true" /> : <ChevronsRight size={20} aria-hidden="true" />}
        {expanded && <span>{label}</span>}
      </Button>
      {!expanded && panels.map(panel => <Modal key={panel.id} isOpen={opened === panel.id}
        onOpenChange={open => setOpened(open ? panel.id : null)}>
        <Button type="button" variant="tertiary" isIconOnly aria-label={panel.name}>
          <panel.icon size={20} aria-hidden="true" />
        </Button>
        <Modal.Backdrop variant="transparent">
          <Modal.Container placement="top" scroll="inside" className={`learning-dock-overlay learning-dock-overlay-${side}`}>
            <Modal.Dialog aria-label={panel.name} className="learning-dock-floating">
              <Button slot="close" variant="secondary" size="sm" className="self-end shrink-0" aria-label={`关闭${panel.name}`}>关闭</Button>
              {panel.content}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>)}
    </div>
    <div id={id} className="learning-dock-panels">
      {expanded && panels.map(panel => <div key={panel.id} className="learning-dock-panel">{panel.content}</div>)}
    </div>
  </aside>
}
