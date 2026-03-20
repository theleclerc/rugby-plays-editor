import { SavedFrame } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { Trash } from '@phosphor-icons/react'
import { formatDistance } from 'date-fns'

interface LoadFrameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  savedFrames: SavedFrame[]
  onLoad: (savedFrame: SavedFrame) => void
  onDelete: (id: string) => void
}

export const LoadFrameDialog = ({
  open,
  onOpenChange,
  savedFrames,
  onLoad,
  onDelete,
}: LoadFrameDialogProps) => {
  const handleLoad = (savedFrame: SavedFrame) => {
    onLoad(savedFrame)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Load Base Frame</DialogTitle>
          <DialogDescription>
            Select a saved frame template to load into the current frame.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          {savedFrames.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">No saved frames yet</p>
              <p className="text-sm mt-2">
                Save your first frame to reuse it later
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedFrames.map((savedFrame) => (
                <Card
                  key={savedFrame.id}
                  className="p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">
                        {savedFrame.name}
                      </h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>
                          {savedFrame.frame.players.length} player
                          {savedFrame.frame.players.length !== 1 ? 's' : ''}
                        </span>
                        {savedFrame.frame.ball && <span>• 1 ball</span>}
                        {savedFrame.frame.emojis.length > 0 && (
                          <span>
                            • {savedFrame.frame.emojis.length} emoji
                            {savedFrame.frame.emojis.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        <span className="ml-auto">
                          {formatDistance(savedFrame.createdAt, Date.now(), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleLoad(savedFrame)}
                        size="sm"
                      >
                        Load
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(savedFrame.id)
                        }}
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
