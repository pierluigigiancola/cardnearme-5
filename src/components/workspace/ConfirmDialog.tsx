import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'

/** Asks before a destructive action, such as deleting a deck or a Binder entry. */
export function ConfirmDialog({ confirmLabel, description, onConfirm, onOpenChange, open, pending = false, title }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  /** Disables the confirm button while the action runs. */
  pending?: boolean
}) {
  return (
    <Dialog
      onOpenChange={onOpenChange}
      open={open}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>

          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            variant="ghost"
          >
            Cancel
          </Button>

          <Button
            disabled={pending}
            onClick={onConfirm}
            variant="destructive"
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
