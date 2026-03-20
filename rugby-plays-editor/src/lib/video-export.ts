import { Frame, Player, Ball, Emoji, CropRegion } from './types'
import { 
  drawRugbyField, 
  drawPlayer, 
  drawBall, 
  drawEmoji,
  FIELD_WIDTH,
  FIELD_HEIGHT,
  loadFieldImage
} from './canvas-utils'

interface InterpolatedFrame {
  players: Player[]
  ball: Ball | null
  emojis: Emoji[]
  opacity?: number
}

const lerp = (start: number, end: number, t: number): number => {
  return start + (end - start) * t
}

const interpolatePlayer = (p1: Player | undefined, p2: Player | undefined, t: number): Player | undefined => {
  if (!p1 && !p2) return undefined
  if (!p1) return p2
  if (!p2) return p1
  
  return {
    ...p1,
    x: lerp(p1.x, p2.x, t),
    y: lerp(p1.y, p2.y, t)
  }
}

const interpolateBall = (b1: Ball | null, b2: Ball | null, t: number): Ball | null => {
  if (!b1 && !b2) return null
  if (!b1) return b2
  if (!b2) return b1
  
  return {
    ...b1,
    x: lerp(b1.x, b2.x, t),
    y: lerp(b1.y, b2.y, t)
  }
}

const interpolateEmoji = (e1: Emoji | undefined, e2: Emoji | undefined, t: number): Emoji | undefined => {
  if (!e1 && !e2) return undefined
  if (!e1) return e2
  if (!e2) return e1
  
  return {
    ...e1,
    x: lerp(e1.x, e2.x, t),
    y: lerp(e1.y, e2.y, t)
  }
}

const interpolateFrames = (frame1: Frame, frame2: Frame, steps: number): InterpolatedFrame[] => {
  const interpolated: InterpolatedFrame[] = []
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    
    const players: Player[] = []
    const allPlayerNumbers = new Set([
      ...frame1.players.map(p => `${p.team}-${p.number}`),
      ...frame2.players.map(p => `${p.team}-${p.number}`)
    ])
    
    allPlayerNumbers.forEach(key => {
      const [team, number] = key.split('-')
      const p1 = frame1.players.find(p => p.team === team && p.number === parseInt(number))
      const p2 = frame2.players.find(p => p.team === team && p.number === parseInt(number))
      
      const interpolated = interpolatePlayer(p1, p2, t)
      if (interpolated) {
        players.push(interpolated)
      }
    })
    
    const ball = interpolateBall(frame1.ball, frame2.ball, t)
    
    const emojis: Emoji[] = []
    const maxEmojis = Math.max(frame1.emojis.length, frame2.emojis.length)
    for (let j = 0; j < maxEmojis; j++) {
      const e1 = frame1.emojis[j]
      const e2 = frame2.emojis[j]
      const interpolated = interpolateEmoji(e1, e2, t)
      if (interpolated) {
        emojis.push(interpolated)
      }
    }
    
    interpolated.push({ players, ball, emojis })
  }
  
  return interpolated
}

export const generateVideo = async (
  frames: Frame[],
  frameDuration: number,
  interpolationFrames: number,
  fps: number,
  cropRegion?: CropRegion,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  const fieldImage = await loadFieldImage()
  
  const canvas = document.createElement('canvas')
  const outputCanvas = document.createElement('canvas')
  
  if (cropRegion) {
    canvas.width = FIELD_WIDTH
    canvas.height = FIELD_HEIGHT
    outputCanvas.width = cropRegion.width
    outputCanvas.height = cropRegion.height
  } else {
    canvas.width = FIELD_WIDTH
    canvas.height = FIELD_HEIGHT
    outputCanvas.width = FIELD_WIDTH
    outputCanvas.height = FIELD_HEIGHT
  }
  
  const ctx = canvas.getContext('2d')!
  const outputCtx = outputCanvas.getContext('2d')!
  
  const allInterpolatedFrames: InterpolatedFrame[] = []
  
  for (let i = 0; i < frames.length; i++) {
    const currentFrame = frames[i]
    const nextFrame = frames[i + 1]
    
    if (nextFrame) {
      const interpolated = interpolateFrames(currentFrame, nextFrame, interpolationFrames)
      allInterpolatedFrames.push(...interpolated)
    } else {
      allInterpolatedFrames.push({
        players: currentFrame.players,
        ball: currentFrame.ball,
        emojis: currentFrame.emojis
      })
      
      for (let j = 0; j < frameDuration * fps; j++) {
        allInterpolatedFrames.push({
          players: currentFrame.players,
          ball: currentFrame.ball,
          emojis: currentFrame.emojis
        })
      }
    }
  }
  
  const stream = outputCanvas.captureStream(fps)
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 2500000
  })
  
  const chunks: Blob[] = []
  
  return new Promise((resolve, reject) => {
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data)
      }
    }
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' })
      resolve(blob)
    }
    
    mediaRecorder.onerror = (e) => {
      reject(e)
    }
    
    mediaRecorder.start()
    
    let currentFrameIndex = 0
    const frameInterval = 1000 / fps
    
    const renderFrame = () => {
      if (currentFrameIndex >= allInterpolatedFrames.length) {
        mediaRecorder.stop()
        return
      }
      
      const frame = allInterpolatedFrames[currentFrameIndex]
      
      drawRugbyField(ctx, FIELD_WIDTH, FIELD_HEIGHT, fieldImage)
      
      frame.players.forEach(player => drawPlayer(ctx, player))
      if (frame.ball) drawBall(ctx, frame.ball)
      frame.emojis.forEach(emoji => drawEmoji(ctx, emoji))
      
      if (cropRegion) {
        outputCtx.clearRect(0, 0, cropRegion.width, cropRegion.height)
        outputCtx.drawImage(
          canvas,
          cropRegion.x, cropRegion.y, cropRegion.width, cropRegion.height,
          0, 0, cropRegion.width, cropRegion.height
        )
      } else {
        outputCtx.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT)
        outputCtx.drawImage(canvas, 0, 0)
      }
      
      if (onProgress) {
        onProgress(currentFrameIndex / allInterpolatedFrames.length)
      }
      
      currentFrameIndex++
      setTimeout(renderFrame, frameInterval)
    }
    
    renderFrame()
  })
}
