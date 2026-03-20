import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SaveFrameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (name: string) => void
}

export const SaveFrameDialog = ({ open, onOpenChange, onSave }: SaveFrameDialogProps) => {
  const [name, setName] = useState('')

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim())
      setName('')
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Base Frame</DialogTitle>
          <DialogDescription>
            Give this frame template a name so you can load it later.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="frame-name">Frame Name</Label>
            <Input
              id="frame-name"
              placeholder="e.g., Standard Formation, Attack Setup"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave()
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Save Frame
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
