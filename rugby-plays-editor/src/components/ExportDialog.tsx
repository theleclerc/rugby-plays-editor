import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Download, Play, X } from '@phosphor-icons/react'

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExport: (frameDuration: number, interpolationFrames: number, fps: number) => Promise<Blob>
}

export const ExportDialog = ({ open, onOpenChange, onExport }: ExportDialogProps) => {
  const [frameDuration, setFrameDuration] = useState(1)
  const [interpolationFrames, setInterpolationFrames] = useState(30)
  const [fps, setFps] = useState(30)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const handleClosePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    setPreviewBlob(null)
  }

  const handlePreview = async () => {
    setIsGenerating(true)
    setProgress(0)
    handleClosePreview()
    
    try {
      const blob = await onExport(frameDuration, interpolationFrames, fps)
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
      setPreviewBlob(blob)
    } catch (error) {
      console.error('Preview generation failed:', error)
    } finally {
      setIsGenerating(false)
      setProgress(0)
    }
  }

  const handleDownload = () => {
    if (!previewBlob) return
    
    const url = URL.createObjectURL(previewBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rugby-play-${Date.now()}.webm`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    onOpenChange(false)
    handleClosePreview()
  }

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) {
        handleClosePreview()
      }
      onOpenChange(open)
    }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Video</DialogTitle>
          <DialogDescription>
            Configure your video export settings and preview before downloading
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {previewUrl ? (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden border border-border bg-muted">
                <video
                  src={previewUrl}
                  controls
                  autoPlay
                  loop
                  className="w-full"
                  style={{ maxHeight: '400px' }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 bg-background/80 hover:bg-background"
                  onClick={handleClosePreview}
                >
                  <X weight="bold" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Preview your video above. Click download to save it.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Frame Duration: {frameDuration}s</Label>
                <Slider
                  value={[frameDuration]}
                  onValueChange={([value]) => setFrameDuration(value)}
                  min={0.5}
                  max={5}
                  step={0.5}
                  disabled={isGenerating}
                />
                <p className="text-xs text-muted-foreground">
                  How long each frame should be displayed
                </p>
              </div>

              <div className="space-y-2">
                <Label>Transition Frames: {interpolationFrames}</Label>
                <Slider
                  value={[interpolationFrames]}
                  onValueChange={([value]) => setInterpolationFrames(value)}
                  min={10}
                  max={60}
                  step={5}
                  disabled={isGenerating}
                />
                <p className="text-xs text-muted-foreground">
                  Number of frames for smooth transitions between positions
                </p>
              </div>

              <div className="space-y-2">
                <Label>FPS: {fps}</Label>
                <Slider
                  value={[fps]}
                  onValueChange={([value]) => setFps(value)}
                  min={15}
                  max={60}
                  step={15}
                  disabled={isGenerating}
                />
                <p className="text-xs text-muted-foreground">
                  Frames per second (higher = smoother but larger file)
                </p>
              </div>

              {isGenerating && (
                <div className="space-y-2">
                  <Label>Generating preview...</Label>
                  <Progress value={progress * 100} />
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              handleClosePreview()
              onOpenChange(false)
            }}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          {previewUrl ? (
            <Button
              onClick={handleDownload}
              className="gap-2"
            >
              <Download weight="bold" className="w-4 h-4" />
              Download
            </Button>
          ) : (
            <Button
              onClick={handlePreview}
              disabled={isGenerating}
              className="gap-2"
            >
              <Play weight="fill" className="w-4 h-4" />
              {isGenerating ? 'Generating...' : 'Preview'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
