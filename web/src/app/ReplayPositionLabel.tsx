import { useLingui } from '@lingui/react/macro'

export function ReplayPositionLabel({ index, last: lastStep, generated }: { index: number; last: number; generated: boolean }) {
  const { t } = useLingui()
  return <span className="font-mono whitespace-nowrap">{generated ? `${index} / ${lastStep}` : t`Current ${index} · Generated 0–${lastStep}`}</span>
}
