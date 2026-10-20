import { useLingui } from '@lingui/react/macro'
import { Select } from '@heroui/react/select'
import { ListBox } from '@heroui/react/list-box'
import { Switch } from '@heroui/react/switch'
import { Label } from '@heroui/react/label'
import { Chip } from '@heroui/react/chip'

export function LearningDisplayControls({ ratios, layout, onLayoutChange, label, zenMode, onZenModeChange }: {
  ratios: readonly string[]; layout: string; onLayoutChange: (value: string) => void
  label: string; zenMode: boolean; onZenModeChange: (value: boolean) => void
}) {
  const { t } = useLingui()
  return <>
    <Select className="learning-layout-select w-24" aria-label={label} value={layout}
      onChange={value => { if (typeof value === 'string' && ratios.includes(value)) onLayoutChange(value) }}>
      <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
      <Select.Popover><ListBox>
        {ratios.map(ratio => <ListBox.Item key={ratio} id={ratio} textValue={ratio}>
          {ratio}<ListBox.ItemIndicator />
        </ListBox.Item>)}
      </ListBox></Select.Popover>
    </Select>
    <Switch size="sm" isSelected={zenMode} onChange={onZenModeChange}
      inputRef={input => { input?.setAttribute('aria-keyshortcuts', 'z') }}>
      <Switch.Content>
        <Switch.Control><Switch.Thumb /></Switch.Control>
        <Label>{t`Zen mode`}</Label><Chip color="accent" variant="soft" size="sm" aria-hidden="true">Z</Chip>
      </Switch.Content>
    </Switch>
  </>
}
