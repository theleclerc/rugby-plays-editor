import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

export interface BatchExportProgress {
  /** Total number of projects in the batch. */
  total: number
  /** How many projects have fully completed (rendered + downloaded). */
  completed: number
  /** Name of the project currently rendering. */
  currentName: string
  /** Render progress of the current project, 0..1. */
  currentProgress: number
}

interface BatchExportProgressDialogProps {
  open: boolean
  state: BatchExportProgress
  onCancel: () => void
}

export function BatchExportProgressDialog({
  open,
  state,
  onCancel,
}: BatchExportProgressDialogProps) {
  const { total, completed, currentName, currentProgress } = state
  const overall =
    total > 0 ? (completed + Math.min(1, Math.max(0, currentProgress))) / total : 0

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            Exporting videos {Math.min(completed + 1, total)} / {total}
          </DialogTitle>
          <DialogDescription>
            Rendering &ldquo;{currentName}&rdquo;. Keep this tab focused until the
            batch finishes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Progress value={overall * 100} />
          <p className="text-xs text-muted-foreground">
            {completed} of {total} done
          </p>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
