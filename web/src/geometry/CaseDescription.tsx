import { Button } from '@heroui/react/button'
import { Modal } from '@heroui/react/modal'
import { useLingui } from '@lingui/react/macro'
import { X } from 'lucide-react'

export function CaseDescription({ name, description }: { name: string; description: string }) {
  const { t } = useLingui()
  return <Modal>
    <Button variant="tertiary" size="sm">{t`About this case`}</Button>
    <Modal.Backdrop>
      <Modal.Container scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger aria-label={t`Close help`}><X size={16} aria-hidden="true" /></Modal.CloseTrigger>
          <Modal.Header><Modal.Heading>{t`About this case`}</Modal.Heading></Modal.Header>
          <Modal.Body className="flex flex-col gap-3">
            <h2 className="font-semibold">{name}</h2>
            <p>{description}</p>
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  </Modal>
}
