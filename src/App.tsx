import { useState, useEffect, useRef } from 'react'
import { useKV } from '@/lib/storage'
import { Frame, Tool, Team, SavedFrame, SavedProject, CropRegion } from '@/lib/types'
import { createEmptyFrame, duplicateFrame, addTeamInLine } from '@/lib/canvas-utils'
import { generateVideo } from '@/lib/video-export'
import { downloadProjectFile, importProject } from '@/lib/project-utils'
import { RugbyFieldCanvas } from '@/components/RugbyFieldCanvas'
import { Toolbar } from '@/components/Toolbar'
import { FrameTimeline } from '@/components/FrameTimeline'
import { ExportDialog } from '@/components/ExportDialog'
import { SaveFrameDialog } from '@/components/SaveFrameDialog'
import { LoadFrameDialog } from '@/components/LoadFrameDialog'
import { SaveProjectDialog } from '@/components/SaveProjectDialog'
import { LoadProjectDialog } from '@/components/LoadProjectDialog'
import { Button } from '@/components/ui/button'
import { Toaster, toast } from 'sonner'

function App() {
  const [frames, setFrames] = useKV<Frame[]>('rugby-frames', [createEmptyFrame()])
  const [savedFrames, setSavedFrames] = useKV<SavedFrame[]>('rugby-saved-frames', [])
  const [savedProjects, setSavedProjects] = useKV<SavedProject[]>('rugby-saved-projects', [])
  const [cropRegion, setCropRegion] = useKV<CropRegion | undefined>('rugby-crop-region', undefined)
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0)
  const [tool, setTool] = useState<Tool>('select')
  const [selectedTeam, setSelectedTeam] = useState<Team>('blue')
  const [selectedNumber, setSelectedNumber] = useState(1)
  const [selectedEmoji, setSelectedEmoji] = useState('🏉')
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [saveFrameDialogOpen, setSaveFrameDialogOpen] = useState(false)
  const [loadFrameDialogOpen, setLoadFrameDialogOpen] = useState(false)
  const [saveProjectDialogOpen, setSaveProjectDialogOpen] = useState(false)
  const [loadProjectDialogOpen, setLoadProjectDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const safeFrames = frames || [createEmptyFrame()]
  const currentFrame = safeFrames[currentFrameIndex]

  useEffect(() => {
    if (!frames || frames.length === 0) {
      setFrames([createEmptyFrame()])
    }
  }, [frames, setFrames])

  const handleFrameUpdate = (updatedFrame: Frame) => {
    setFrames((current) => {
      const currentFrames = current || [createEmptyFrame()]
      const newFrames = [...currentFrames]
      newFrames[currentFrameIndex] = updatedFrame
      return newFrames
    })
  }

  const handleFrameAdd = () => {
    const newFrame = duplicateFrame(currentFrame)
    setFrames((current) => {
      const currentFrames = current || [createEmptyFrame()]
      const newFrames = [...currentFrames]
      newFrames.splice(currentFrameIndex + 1, 0, newFrame)
      return newFrames
    })
    setCurrentFrameIndex(currentFrameIndex + 1)
    toast.success('New frame added')
  }

  const handleFrameDelete = (index: number) => {
    if (safeFrames.length <= 1) {
      toast.error('Cannot delete the last frame')
      return
    }

    setFrames((current) => {
      const currentFrames = current || [createEmptyFrame()]
      return currentFrames.filter((_, i) => i !== index)
    })
    
    if (currentFrameIndex >= index && currentFrameIndex > 0) {
      setCurrentFrameIndex((prev) => prev - 1)
    }
    
    toast.success('Frame deleted')
  }

  const handleExport = async (
    frameDuration: number,
    interpolationFrames: number,
    fps: number
  ): Promise<Blob> => {
    try {
      const blob = await generateVideo(
        safeFrames,
        frameDuration,
        interpolationFrames,
        fps,
        cropRegion,
        (progress) => {
          console.log(`Export progress: ${(progress * 100).toFixed(0)}%`)
        }
      )
      
      return blob
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to generate video')
      throw error
    }
  }

  const handleAddTeamLine = (team: Team) => {
    const updatedFrame = addTeamInLine(currentFrame, team)
    handleFrameUpdate(updatedFrame)
    toast.success(`Added ${team} team in horizontal line`)
  }

  const handlePlayerAdded = () => {
    setSelectedNumber((prev) => prev + 1)
  }

  const handleSaveFrame = (name: string) => {
    const savedFrame: SavedFrame = {
      id: crypto.randomUUID(),
      name,
      frame: JSON.parse(JSON.stringify(currentFrame)),
      createdAt: Date.now(),
    }
    
    setSavedFrames((current) => [...(current || []), savedFrame])
    toast.success(`Frame "${name}" saved successfully`)
  }

  const handleLoadFrame = (savedFrame: SavedFrame) => {
    const loadedFrame = JSON.parse(JSON.stringify(savedFrame.frame))
    loadedFrame.id = crypto.randomUUID()
    
    handleFrameUpdate(loadedFrame)
    toast.success(`Frame "${savedFrame.name}" loaded`)
  }

  const handleDeleteSavedFrame = (id: string) => {
    setSavedFrames((current) => {
      const currentFrames = current || []
      return currentFrames.filter((frame) => frame.id !== id)
    })
    toast.success('Saved frame deleted')
  }

  const handleSaveProject = () => {
    downloadProjectFile(safeFrames, cropRegion)
    toast.success('Project saved successfully')
  }

  const handleLoadProject = () => {
    fileInputRef.current?.click()
  }

  const handleSaveProjectLocally = () => {
    setSaveProjectDialogOpen(true)
  }

  const handleLoadProjectLocally = () => {
    setLoadProjectDialogOpen(true)
  }

  const handleSaveProjectWithName = (name: string) => {
    const savedProject: SavedProject = {
      id: crypto.randomUUID(),
      name,
      frames: JSON.parse(JSON.stringify(safeFrames)),
      cropRegion: cropRegion ? JSON.parse(JSON.stringify(cropRegion)) : undefined,
      createdAt: Date.now(),
    }
    
    setSavedProjects((current) => [...(current || []), savedProject])
    toast.success(`Project "${name}" saved successfully`)
  }

  const handleLoadSavedProject = (savedProject: SavedProject) => {
    const loadedFrames = JSON.parse(JSON.stringify(savedProject.frames))
    loadedFrames.forEach((frame: Frame) => {
      frame.id = crypto.randomUUID()
    })
    
    setFrames(loadedFrames)
    setCurrentFrameIndex(0)
    if (savedProject.cropRegion) {
      setCropRegion(JSON.parse(JSON.stringify(savedProject.cropRegion)))
    } else {
      setCropRegion(undefined)
    }
    toast.success(`Project "${savedProject.name}" loaded`)
  }

  const handleDeleteSavedProject = (id: string) => {
    setSavedProjects((current) => {
      const currentProjects = current || []
      return currentProjects.filter((project) => project.id !== id)
    })
    toast.success('Saved project deleted')
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const jsonString = e.target?.result as string
        const { frames: loadedFrames, cropRegion: loadedCropRegion } = importProject(jsonString)
        
        setFrames(loadedFrames)
        setCurrentFrameIndex(0)
        if (loadedCropRegion) {
          setCropRegion(loadedCropRegion)
        } else {
          setCropRegion(undefined)
        }
        toast.success('Project loaded successfully')
      } catch (error) {
        toast.error('Failed to load project file')
      }
    }
    reader.readAsText(file)
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <Toaster position="top-right" />
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Rugby Slate</h1>
          <p className="text-muted-foreground">
            Design and animate rugby plays with precision
          </p>
        </header>

        <Toolbar
          tool={tool}
          onToolChange={setTool}
          selectedTeam={selectedTeam}
          onTeamChange={setSelectedTeam}
          selectedNumber={selectedNumber}
          onNumberChange={setSelectedNumber}
          selectedEmoji={selectedEmoji}
          onEmojiChange={setSelectedEmoji}
          onExport={() => setExportDialogOpen(true)}
          onAddTeamLine={handleAddTeamLine}
          onSaveFrame={() => setSaveFrameDialogOpen(true)}
          onLoadFrame={() => setLoadFrameDialogOpen(true)}
          onSaveProject={handleSaveProject}
          onLoadProject={handleLoadProject}
          onSaveProjectLocally={handleSaveProjectLocally}
          onLoadProjectLocally={handleLoadProjectLocally}
        />

        <div className="flex justify-center">
          <div className="relative">
            <RugbyFieldCanvas
              frame={currentFrame}
              onFrameUpdate={handleFrameUpdate}
              tool={tool}
              selectedTeam={selectedTeam}
              selectedNumber={selectedNumber}
              selectedEmoji={selectedEmoji}
              cropRegion={cropRegion}
              onCropRegionChange={setCropRegion}
              onPlayerAdded={handlePlayerAdded}
            />
            {cropRegion && (
              <div className="absolute top-2 right-2 bg-card border border-border rounded-lg shadow-lg p-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    Crop: {Math.round(cropRegion.width)} × {Math.round(cropRegion.height)}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setCropRegion(undefined)}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <FrameTimeline
          frames={safeFrames}
          currentFrameIndex={currentFrameIndex}
          onFrameSelect={setCurrentFrameIndex}
          onFrameAdd={handleFrameAdd}
          onFrameDelete={handleFrameDelete}
        />

        <ExportDialog
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
          onExport={handleExport}
        />

        <SaveFrameDialog
          open={saveFrameDialogOpen}
          onOpenChange={setSaveFrameDialogOpen}
          onSave={handleSaveFrame}
        />

        <LoadFrameDialog
          open={loadFrameDialogOpen}
          onOpenChange={setLoadFrameDialogOpen}
          savedFrames={savedFrames || []}
          onLoad={handleLoadFrame}
          onDelete={handleDeleteSavedFrame}
        />

        <SaveProjectDialog
          open={saveProjectDialogOpen}
          onOpenChange={setSaveProjectDialogOpen}
          onSave={handleSaveProjectWithName}
        />

        <LoadProjectDialog
          open={loadProjectDialogOpen}
          onOpenChange={setLoadProjectDialogOpen}
          savedProjects={savedProjects || []}
          onLoad={handleLoadSavedProject}
          onDelete={handleDeleteSavedProject}
        />
      </div>
    </div>
  );
}

export default App