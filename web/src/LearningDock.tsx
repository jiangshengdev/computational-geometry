import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronsLeft, ChevronsRight, type LucideIcon } from 'lucide-react'
import { FocusScope } from 'react-aria/FocusScope'
import { useLayoutPreference } from './useLayoutPreference'
import './LearningDock.css'

interface DockPanel { id: string; name: string; icon: LucideIcon; content: ReactNode }

export function LearningDock({ side, panels }: { side: 'left' | 'right'; panels: DockPanel[] }) {
  const [expanded, setExpanded] = useLayoutPreference(`bo-learning-layout-v1-${side}`, false,
    (value): value is boolean => typeof value === 'boolean')
  const [opened, setOpened] = useState<string | null>(null)
  const id = useId()
  const trigger = useRef<HTMLButtonElement | null>(null)
  const floating = useRef<HTMLDivElement | null>(null)
  const label = `${side === 'left' ? '左' : '右'}侧辅助栏`
  const close = () => {
    setOpened(null)
  }
  useLayoutEffect(() => {
    if (opened !== null) floating.current?.focus({ preventScroll: true })
    else trigger.current?.focus({ preventScroll: true })
  }, [opened])

  return <aside aria-label={label} className={`learning-dock learning-dock-${side}`} data-expanded={expanded}>
    <div className="learning-dock-controls">
      <button type="button" className="learning-dock-button" aria-label={`${expanded ? '收起' : '展开'}${label}`}
        aria-expanded={expanded} aria-controls={id}
        onClick={() => { setOpened(null); setExpanded(!expanded) }}>
        {expanded === (side === 'left') ? <ChevronsLeft size={20} aria-hidden="true" /> : <ChevronsRight size={20} aria-hidden="true" />}
        {expanded && <span>{label}</span>}
      </button>
      {!expanded && panels.map(panel => <button key={panel.id} type="button" className="learning-dock-button"
        aria-label={panel.name} title={panel.name} aria-haspopup="dialog" aria-expanded={opened === panel.id}
        aria-controls={`${id}-${panel.id}`}
        onClick={event => {
          trigger.current = event.currentTarget
          if (opened === panel.id) close()
          else setOpened(panel.id)
        }}><panel.icon size={20} aria-hidden="true" /></button>)}
    </div>
    {opened !== null && !expanded && <div className="learning-dock-dismiss" aria-hidden="true"
      onPointerDown={event => event.preventDefault()} onClick={event => { event.stopPropagation(); close() }} />}
    <div id={id} className="learning-dock-panels">
      {panels.map(panel => {
        const isFloating = !expanded && opened === panel.id
        return <FocusScope key={panel.id} contain={isFloating}><div id={`${id}-${panel.id}`} hidden={!expanded && !isFloating}
          ref={isFloating ? floating : undefined} className={`learning-dock-panel${isFloating ? ' learning-dock-floating' : ''}`}
          role={isFloating ? 'dialog' : undefined} aria-label={isFloating ? panel.name : undefined}
          tabIndex={isFloating ? -1 : undefined}
          onKeyDown={event => {
            if (!isFloating) return
            event.stopPropagation()
            if (event.key === 'Escape') { event.preventDefault(); close() }
          }}>
          {isFloating && <button type="button" className="learning-dock-close" aria-label={`关闭${panel.name}`} onClick={close}>关闭</button>}
          {panel.content}
        </div></FocusScope>
      })}
    </div>
  </aside>
}
