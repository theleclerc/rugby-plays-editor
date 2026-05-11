import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { isDev, slugify } from '@/lib/dev-storage'

export type SaveProjectTarget = 'library' | 'scratch' | 'examples'

interface SaveProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (name: string, target: SaveProjectTarget) => void
}

export function SaveProjectDialog({ open, onOpenChange, onSave }: SaveProjectDialogProps) {
  const [projectName, setProjectName] = useState('')
  const [target, setTarget] = useState<SaveProjectTarget>('library')

  const handleSave = () => {
    const trimmed = projectName.trim()
    if (!trimmed) return
    onSave(trimmed, target)
    setProjectName('')
    setTarget('library')
    onOpenChange(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
  }

  const slug = projectName.trim() ? slugify(projectName.trim()) : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Project</DialogTitle>
          <DialogDescription>
            Enter a name for your project to save it locally
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              placeholder="e.g., Training Drill 1"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>

          {isDev && (
            <div className="space-y-2">
              <Label>Save to</Label>
              <RadioGroup
                value={target}
                onValueChange={(v) => setTarget(v as SaveProjectTarget)}
                className="space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="library" id="save-target-library" />
                  <Label htmlFor="save-target-library" className="font-normal">
                    My library (browser)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="scratch" id="save-target-scratch" />
                  <Label htmlFor="save-target-scratch" className="font-normal">
                    Scratch (dev disk, gitignored)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="examples" id="save-target-examples" />
                  <Label htmlFor="save-target-examples" className="font-normal">
                    Examples (repo — bundles with the app)
                  </Label>
                </div>
              </RadioGroup>
              {target !== 'library' && slug && (
                <p className="text-xs text-muted-foreground">
                  Filename: <code>{slug}.json</code>
                </p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!projectName.trim()}>
            Save Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
