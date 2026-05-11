import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { SavedProject } from '@/lib/types'
import { Trash, FileText, ArrowsClockwise } from '@phosphor-icons/react'
import {
  isDev,
  listScratch,
  readScratch,
  deleteScratch,
  listExamples,
  readExample,
  deleteExample,
  type DevEntry,
} from '@/lib/dev-storage'

interface LoadProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  savedProjects: SavedProject[]
  onLoad: (project: SavedProject) => void
  onDelete: (id: string) => void
}

type Tab = 'library' | 'scratch' | 'examples'

export function LoadProjectDialog({
  open,
  onOpenChange,
  savedProjects,
  onLoad,
  onDelete,
}: LoadProjectDialogProps) {
  const [tab, setTab] = useState<Tab>('library')

  const handleLoadLibrary = (project: SavedProject) => {
    onLoad(project)
    onOpenChange(false)
  }

  const handleDeleteLibrary = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    onDelete(id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Load Project</DialogTitle>
          <DialogDescription>Select a saved project to load</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList>
            <TabsTrigger value="library">My library</TabsTrigger>
            {isDev && <TabsTrigger value="scratch">Scratch</TabsTrigger>}
            {isDev && <TabsTrigger value="examples">Examples</TabsTrigger>}
          </TabsList>

          <TabsContent value="library">
            <ScrollArea className="h-[400px] pr-4">
              {savedProjects.length === 0 ? (
                <EmptyState text="No saved projects yet" />
              ) : (
                <div className="space-y-2">
                  {savedProjects.map((project) => (
                    <Card
                      key={project.id}
                      className="cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => handleLoadLibrary(project)}
                    >
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex-1">
                          <h3 className="font-medium">{project.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {project.frames.length} frame
                            {project.frames.length !== 1 ? 's' : ''} •{' '}
                            {new Date(project.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDeleteLibrary(e, project.id)}
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
          </TabsContent>

          {isDev && (
            <TabsContent value="scratch">
              <DevTab
                active={open && tab === 'scratch'}
                fetcher={listScratch}
                reader={readScratch}
                deleter={deleteScratch}
                onLoad={(p) => {
                  onLoad(p)
                  onOpenChange(false)
                }}
                emptyText="No scratch saves yet"
              />
            </TabsContent>
          )}

          {isDev && (
            <TabsContent value="examples">
              <DevTab
                active={open && tab === 'examples'}
                fetcher={listExamples}
                reader={readExample}
                deleter={deleteExample}
                onLoad={(p) => {
                  onLoad(p)
                  onOpenChange(false)
                }}
                emptyText="No example files in src/examples/"
              />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <FileText size={48} className="text-muted-foreground mb-4" />
      <p className="text-muted-foreground">{text}</p>
    </div>
  )
}

interface DevTabProps {
  active: boolean
  fetcher: () => Promise<DevEntry[]>
  reader: (name: string) => Promise<SavedProject>
  deleter: (name: string) => Promise<void>
  onLoad: (project: SavedProject) => void
  emptyText: string
}

function DevTab({ active, fetcher, reader, deleter, onLoad, emptyText }: DevTabProps) {
  const [entries, setEntries] = useState<DevEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      setEntries(await fetcher())
    } catch (err) {
      setError((err as Error).message)
      setEntries([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (active) refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  const handleLoad = async (entry: DevEntry) => {
    try {
      const project = await reader(entry.name)
      // Files don't carry id/createdAt — fill them so the rest of the app is happy.
      const ready: SavedProject = {
        id: crypto.randomUUID(),
        name: project.name ?? entry.name.replace(/\.json$/, ''),
        frames: project.frames,
        cropRegion: project.cropRegion,
        createdAt:
          typeof project.createdAt === 'number' ? project.createdAt : entry.savedAt,
      }
      onLoad(ready)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const handleDelete = async (e: React.MouseEvent, entry: DevEntry) => {
    e.stopPropagation()
    try {
      await deleter(entry.name)
      await refresh()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
          <ArrowsClockwise size={14} className="mr-1" />
          Refresh
        </Button>
      </div>
      <ScrollArea className="h-[360px] pr-4">
        {loading && entries === null ? (
          <EmptyState text="Loading…" />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-destructive mb-2">Dev server not reachable</p>
            <p className="text-xs text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" size="sm" onClick={refresh}>
              Retry
            </Button>
          </div>
        ) : entries && entries.length === 0 ? (
          <EmptyState text={emptyText} />
        ) : (
          <div className="space-y-2">
            {entries!.map((entry) => (
              <Card
                key={entry.name}
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => handleLoad(entry)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex-1">
                    <h3 className="font-medium">{entry.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {entry.frameCount} frame{entry.frameCount !== 1 ? 's' : ''} •{' '}
                      {new Date(entry.savedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDelete(e, entry)}
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
    </div>
  )
}
