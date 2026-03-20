import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SavedProject } from '@/lib/types'
import { Trash, FileText } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'

interface LoadProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  savedProjects: SavedProject[]
  onLoad: (project: SavedProject) => void
  onDelete: (id: string) => void
}

export function LoadProjectDialog({
  open,
  onOpenChange,
  savedProjects,
  onLoad,
  onDelete,
}: LoadProjectDialogProps) {
  const handleLoad = (project: SavedProject) => {
    onLoad(project)
    onOpenChange(false)
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    onDelete(id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Load Project</DialogTitle>
          <DialogDescription>
            Select a saved project to load
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          {savedProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText size={48} className="text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No saved projects yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {savedProjects.map((project) => (
                <Card
                  key={project.id}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleLoad(project)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex-1">
                      <h3 className="font-medium">{project.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {project.frames.length} frame{project.frames.length !== 1 ? 's' : ''} •{' '}
                        {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDelete(e, project.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash size={18} />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
