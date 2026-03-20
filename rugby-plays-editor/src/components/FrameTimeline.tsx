import { useEffect, useRef } from 'react'
import { Frame } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Plus, Trash } from '@phosphor-icons/react'
import {
  drawRugbyField,
  drawPlayer,
  drawBall,
  drawEmoji,
  FIELD_WIDTH,
  FIELD_HEIGHT
} from '@/lib/canvas-utils'

interface FrameTimelineProps {
  frames: Frame[]
  currentFrameIndex: number
  onFrameSelect: (index: number) => void
  onFrameAdd: () => void
  onFrameDelete: (index: number) => void
}

const FrameThumbnail = ({ frame, isActive }: { frame: Frame; isActive: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const scale = 0.2
    const width = FIELD_WIDTH * scale
    const height = FIELD_HEIGHT * scale

    ctx.save()
    ctx.scale(scale, scale)

    drawRugbyField(ctx, FIELD_WIDTH, FIELD_HEIGHT)

    frame.players.forEach(player => drawPlayer(ctx, player))
    if (frame.ball) drawBall(ctx, frame.ball)
    frame.emojis.forEach(emoji => drawEmoji(ctx, emoji))

    ctx.restore()
  }, [frame])

  return (
    <canvas
      ref={canvasRef}
      width={FIELD_WIDTH * 0.2}
      height={FIELD_HEIGHT * 0.2}
      className={`rounded border-2 transition-all ${
        isActive ? 'border-accent shadow-md' : 'border-border'
      }`}
    />
  )
}

export const FrameTimeline = ({
  frames,
  currentFrameIndex,
  onFrameSelect,
  onFrameAdd,
  onFrameDelete
}: FrameTimelineProps) => {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Frames</h3>
        <div className="flex gap-2 items-center">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={frames.length <= 1}
              >
                <Trash className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Frame {currentFrameIndex + 1}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. The frame will be permanently removed from your play.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onFrameDelete(currentFrameIndex)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={onFrameAdd} size="sm" className="gap-1.5">
            <Plus weight="bold" className="w-4 h-4" />
            New Frame
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            Frame {currentFrameIndex + 1} / {frames.length}
          </span>
          <Slider
            value={[currentFrameIndex]}
            onValueChange={(value) => onFrameSelect(value[0])}
            min={0}
            max={frames.length - 1}
            step={1}
            className="flex-1"
          />
        </div>

        <div className="flex justify-center">
          <FrameThumbnail frame={frames[currentFrameIndex]} isActive={true} />
        </div>
      </div>
    </Card>
  )
}
