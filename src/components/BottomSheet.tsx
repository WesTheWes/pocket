import * as Dialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'
import { Button } from './Button'

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children?: ReactNode
}

/**
 * A modal sheet anchored to the bottom on phones and centred on desktop. Radix provides the
 * focus trap, Escape to close, scroll lock and the dialog semantics.
 */
export function BottomSheet({ open, onOpenChange, title, description, children }: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-scrim" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[92dvh] w-full max-w-[480px] overflow-y-auto rounded-t-[28px] bg-surface px-5 pb-7 pt-3.5 desk:inset-x-auto desk:bottom-auto desk:left-1/2 desk:top-1/2 desk:max-w-[440px] desk:-translate-x-1/2 desk:-translate-y-1/2 desk:rounded-[28px] desk:pt-7">
          <div
            aria-hidden="true"
            className="mx-auto mb-5 h-1 w-10 rounded-full bg-line desk:hidden"
          />
          <Dialog.Title className="font-display text-[30px] leading-[1.1]">{title}</Dialog.Title>
          {description ? (
            <Dialog.Description className="mt-2.5 text-[15px] text-muted">
              {description}
            </Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">{title}</Dialog.Description>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

interface ConfirmProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  busy?: boolean
  error?: string
}

/** "Are you sure?" for destructive actions. Cancel is always one tap away. */
export function ConfirmSheet({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  busy = false,
  error,
}: ConfirmProps) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={title} description={description}>
      {error && (
        <p role="alert" className="mt-3 text-sm text-pink">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-col gap-2.5">
        <Button variant="destructive" onClick={onConfirm} disabled={busy}>
          {confirmLabel}
        </Button>
        <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
          Cancel
        </Button>
      </div>
    </BottomSheet>
  )
}
