import { useEffect, useRef, useState } from 'react'
import { Frame, Tool, Team, Player, Ball, Emoji, CropRegion } from '@/lib/types'
import {
  drawRugbyField,
  drawPlayer,
  drawBall,
  drawEmoji,
  isPointInPlayer,
  isPointInBall,
  isPointInEmoji,
  FIELD_WIDTH,
  FIELD_HEIGHT,
  PLAYER_RADIUS,
  loadFieldImage
} from '@/lib/canvas-utils'

interface RugbyFieldCanvasProps {
  frame: Frame
  onFrameUpdate: (frame: Frame) => void
  tool: Tool
  selectedTeam: Team
  selectedNumber: number
  selectedEmoji: string
  cropRegion?: CropRegion
  onCropRegionChange?: (region: CropRegion | undefined) => void
  onPlayerAdded?: () => void
}

export const RugbyFieldCanvas = ({
  frame,
  onFrameUpdate,
  tool,
  selectedTeam,
  selectedNumber,
  selectedEmoji,
  cropRegion,
  onCropRegionChange,
  onPlayerAdded
}: RugbyFieldCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedObjectIds, setSelectedObjectIds] = useState<Set<string>>(new Set())
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffsets, setDragOffsets] = useState<Map<string, { x: number; y: number }>>(new Map())
  const [fieldImage, setFieldImage] = useState<HTMLImageElement | null>(null)
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null)
  const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    loadFieldImage().then(img => setFieldImage(img))
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault()
        
        const allObjectIds = new Set<string>()
        frame.players.forEach(player => allObjectIds.add(player.id))
        if (frame.ball) allObjectIds.add(frame.ball.id)
        frame.emojis.forEach(emoji => allObjectIds.add(emoji.id))
        
        setSelectedObjectIds(allObjectIds)
      }
      
      if ((e.metaKey || e.ctrlKey) && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault()
        
        if (selectedObjectIds.size === 0) return
        
        const updatedPlayers = frame.players.filter(p => !selectedObjectIds.has(p.id))
        const updatedBall = frame.ball && selectedObjectIds.has(frame.ball.id) ? null : frame.ball
        const updatedEmojis = frame.emojis.filter(e => !selectedObjectIds.has(e.id))
        
        onFrameUpdate({
          ...frame,
          players: updatedPlayers,
          ball: updatedBall,
          emojis: updatedEmojis
        })
        
        setSelectedObjectIds(new Set())
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [frame, selectedObjectIds, onFrameUpdate])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !fieldImage) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT)
    drawRugbyField(ctx, FIELD_WIDTH, FIELD_HEIGHT, fieldImage)

    frame.players.forEach(player => {
      drawPlayer(ctx, player, selectedObjectIds.has(player.id))
    })

    if (frame.ball) {
      drawBall(ctx, frame.ball, selectedObjectIds.has(frame.ball.id))
    }

    frame.emojis.forEach(emoji => {
      drawEmoji(ctx, emoji, selectedObjectIds.has(emoji.id))
    })

    if (cropRegion) {
      ctx.strokeStyle = 'rgba(255, 165, 0, 0.8)'
      ctx.lineWidth = 3
      ctx.setLineDash([10, 5])
      ctx.strokeRect(cropRegion.x, cropRegion.y, cropRegion.width, cropRegion.height)
      ctx.fillStyle = 'rgba(255, 165, 0, 0.1)'
      ctx.fillRect(cropRegion.x, cropRegion.y, cropRegion.width, cropRegion.height)
      ctx.setLineDash([])
    }

    if (cropStart && cropEnd) {
      const x = Math.min(cropStart.x, cropEnd.x)
      const y = Math.min(cropStart.y, cropEnd.y)
      const width = Math.abs(cropEnd.x - cropStart.x)
      const height = Math.abs(cropEnd.y - cropStart.y)

      ctx.strokeStyle = 'rgba(255, 165, 0, 0.8)'
      ctx.lineWidth = 3
      ctx.setLineDash([10, 5])
      ctx.strokeRect(x, y, width, height)
      ctx.fillStyle = 'rgba(255, 165, 0, 0.1)'
      ctx.fillRect(x, y, width, height)
      ctx.setLineDash([])
    }
  }, [frame, selectedObjectIds, fieldImage, cropRegion, cropStart, cropEnd])

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = FIELD_WIDTH / rect.width
    const scaleY = FIELD_HEIGHT / rect.height

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e)
    const isMultiSelect = e.metaKey || e.ctrlKey

    if (tool === 'crop') {
      setCropStart({ x, y })
      setCropEnd({ x, y })
      return
    }

    if (tool === 'select') {
      let clickedObjectId: string | null = null

      for (const player of frame.players) {
        if (isPointInPlayer(x, y, player)) {
          clickedObjectId = player.id
          break
        }
      }

      if (!clickedObjectId && frame.ball && isPointInBall(x, y, frame.ball)) {
        clickedObjectId = frame.ball.id
      }

      if (!clickedObjectId) {
        for (const emoji of frame.emojis) {
          if (isPointInEmoji(x, y, emoji)) {
            clickedObjectId = emoji.id
            break
          }
        }
      }

      if (clickedObjectId) {
        if (isMultiSelect) {
          const newSelection = new Set(selectedObjectIds)
          if (newSelection.has(clickedObjectId)) {
            newSelection.delete(clickedObjectId)
          } else {
            newSelection.add(clickedObjectId)
          }
          setSelectedObjectIds(newSelection)
        } else {
          if (!selectedObjectIds.has(clickedObjectId)) {
            setSelectedObjectIds(new Set([clickedObjectId]))
          }
        }

        setIsDragging(true)
        
        const offsets = new Map<string, { x: number; y: number }>()
        const objectsToMove = isMultiSelect && selectedObjectIds.has(clickedObjectId) 
          ? selectedObjectIds 
          : new Set([clickedObjectId])

        objectsToMove.forEach(id => {
          const player = frame.players.find(p => p.id === id)
          if (player) {
            offsets.set(id, { x: x - player.x, y: y - player.y })
            return
          }

          if (frame.ball && frame.ball.id === id) {
            offsets.set(id, { x: x - frame.ball.x, y: y - frame.ball.y })
            return
          }

          const emoji = frame.emojis.find(e => e.id === id)
          if (emoji) {
            offsets.set(id, { x: x - emoji.x, y: y - emoji.y })
          }
        })

        setDragOffsets(offsets)
        return
      }

      if (!isMultiSelect) {
        setSelectedObjectIds(new Set())
      }
    } else if (tool === 'player') {
      const newPlayer: Player = {
        id: crypto.randomUUID(),
        number: selectedNumber,
        team: selectedTeam,
        x: Math.max(PLAYER_RADIUS, Math.min(FIELD_WIDTH - PLAYER_RADIUS, x)),
        y: Math.max(PLAYER_RADIUS, Math.min(FIELD_HEIGHT - PLAYER_RADIUS, y))
      }

      onFrameUpdate({
        ...frame,
        players: [...frame.players, newPlayer]
      })
      
      onPlayerAdded?.()
    } else if (tool === 'ball') {
      const newBall: Ball = {
        id: crypto.randomUUID(),
        x: Math.max(PLAYER_RADIUS, Math.min(FIELD_WIDTH - PLAYER_RADIUS, x)),
        y: Math.max(PLAYER_RADIUS, Math.min(FIELD_HEIGHT - PLAYER_RADIUS, y))
      }

      onFrameUpdate({
        ...frame,
        ball: newBall
      })
    } else if (tool === 'emoji') {
      const newEmoji: Emoji = {
        id: crypto.randomUUID(),
        emoji: selectedEmoji,
        x: Math.max(PLAYER_RADIUS, Math.min(FIELD_WIDTH - PLAYER_RADIUS, x)),
        y: Math.max(PLAYER_RADIUS, Math.min(FIELD_HEIGHT - PLAYER_RADIUS, y))
      }

      onFrameUpdate({
        ...frame,
        emojis: [...frame.emojis, newEmoji]
      })
    } else if (tool === 'delete') {
      for (const player of frame.players) {
        if (isPointInPlayer(x, y, player)) {
          onFrameUpdate({
            ...frame,
            players: frame.players.filter(p => p.id !== player.id)
          })
          return
        }
      }

      if (frame.ball && isPointInBall(x, y, frame.ball)) {
        onFrameUpdate({
          ...frame,
          ball: null
        })
        return
      }

      for (const emoji of frame.emojis) {
        if (isPointInEmoji(x, y, emoji)) {
          onFrameUpdate({
            ...frame,
            emojis: frame.emojis.filter(e => e.id !== emoji.id)
          })
          return
        }
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'crop' && cropStart) {
      const { x, y } = getCanvasCoordinates(e)
      setCropEnd({ x, y })
      return
    }

    if (!isDragging || dragOffsets.size === 0) return

    const { x, y } = getCanvasCoordinates(e)
    
    let updatedPlayers = [...frame.players]
    let updatedBall = frame.ball
    let updatedEmojis = [...frame.emojis]

    dragOffsets.forEach((offset, id) => {
      const newX = Math.max(PLAYER_RADIUS, Math.min(FIELD_WIDTH - PLAYER_RADIUS, x - offset.x))
      const newY = Math.max(PLAYER_RADIUS, Math.min(FIELD_HEIGHT - PLAYER_RADIUS, y - offset.y))

      const playerIndex = updatedPlayers.findIndex(p => p.id === id)
      if (playerIndex !== -1) {
        updatedPlayers[playerIndex] = { ...updatedPlayers[playerIndex], x: newX, y: newY }
        return
      }

      if (updatedBall && updatedBall.id === id) {
        updatedBall = { ...updatedBall, x: newX, y: newY }
        return
      }

      const emojiIndex = updatedEmojis.findIndex(e => e.id === id)
      if (emojiIndex !== -1) {
        updatedEmojis[emojiIndex] = { ...updatedEmojis[emojiIndex], x: newX, y: newY }
      }
    })

    onFrameUpdate({
      ...frame,
      players: updatedPlayers,
      ball: updatedBall,
      emojis: updatedEmojis
    })
  }

  const handleMouseUp = () => {
    if (tool === 'crop' && cropStart && cropEnd && onCropRegionChange) {
      const x = Math.min(cropStart.x, cropEnd.x)
      const y = Math.min(cropStart.y, cropEnd.y)
      const width = Math.abs(cropEnd.x - cropStart.x)
      const height = Math.abs(cropEnd.y - cropStart.y)

      if (width > 50 && height > 50) {
        onCropRegionChange({ x, y, width, height })
      }
      setCropStart(null)
      setCropEnd(null)
      return
    }

    setIsDragging(false)
  }

  return (
    <canvas
      ref={canvasRef}
      width={FIELD_WIDTH}
      height={FIELD_HEIGHT}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="border-2 border-border rounded-lg shadow-lg cursor-crosshair max-w-full"
      style={{ 
        maxHeight: '70vh',
        width: 'auto',
        height: 'auto',
        objectFit: 'contain',
        aspectRatio: `${FIELD_WIDTH} / ${FIELD_HEIGHT}`
      }}
    />
  )
}
