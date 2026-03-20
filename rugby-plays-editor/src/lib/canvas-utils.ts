import { Frame, Player, Ball, Emoji } from './types'
import rugbyFieldSvg from '@/assets/images/rugby-field.svg'

export const FIELD_RATIO = 1

export const FIELD_WIDTH = 1180 * FIELD_RATIO
export const FIELD_HEIGHT = 1573 * FIELD_RATIO
export const OBJECT_RATIO = 0.7
export const PLAYER_RADIUS = 18 * OBJECT_RATIO
export const BALL_RADIUS = 12 * OBJECT_RATIO
export const EMOJI_SIZE = 24 * OBJECT_RATIO

export const TEAM_COLORS = {
  blue: 'oklch(0.50 0.20 250)',
  red: 'oklch(0.55 0.22 25)'
}

let fieldImage: HTMLImageElement | null = null
export const loadFieldImage = (): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    if (fieldImage) {
      resolve(fieldImage)
      return
    }
    
    const img = new Image()
    img.onload = () => {
      fieldImage = img
      resolve(img)
    }
    img.onerror = reject
    img.src = rugbyFieldSvg
  })
}

export const createEmptyFrame = (): Frame => ({
  id: crypto.randomUUID(),
  players: [],
  ball: null,
  emojis: []
})

export const duplicateFrame = (frame: Frame): Frame => ({
  id: crypto.randomUUID(),
  players: frame.players.map(p => ({ ...p, id: crypto.randomUUID() })),
  ball: frame.ball ? { ...frame.ball, id: crypto.randomUUID() } : null,
  emojis: frame.emojis.map(e => ({ ...e, id: crypto.randomUUID() }))
})

export const drawRugbyPosts = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  const postWidth = 4
  const postHeight = 80
  const crossbarHeight = 40
  const postSpacing = 35
  
  ctx.strokeStyle = 'oklch(0.95 0 0)'
  ctx.fillStyle = 'oklch(0.95 0 0)'
  ctx.lineWidth = postWidth
  ctx.lineCap = 'round'
  
  ctx.beginPath()
  ctx.moveTo(x - postSpacing / 2, y)
  ctx.lineTo(x - postSpacing / 2, y - postHeight)
  ctx.stroke()
  
  ctx.beginPath()
  ctx.moveTo(x + postSpacing / 2, y)
  ctx.lineTo(x + postSpacing / 2, y - postHeight)
  ctx.stroke()
  
  ctx.lineWidth = postWidth - 1
  ctx.beginPath()
  ctx.moveTo(x - postSpacing / 2, y - crossbarHeight)
  ctx.lineTo(x + postSpacing / 2, y - crossbarHeight)
  ctx.stroke()
}

export const drawRugbyField = (ctx: CanvasRenderingContext2D, width: number, height: number, img?: HTMLImageElement) => {
  if (img) {
    ctx.save()
    ctx.translate(width / 2, height / 2)
    ctx.rotate(Math.PI / 2)
    ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height)
    ctx.restore()
  } else {
    ctx.fillStyle = 'oklch(0.45 0.12 145)'
    ctx.fillRect(0, 0, width, height)
  }
  
  drawRugbyPosts(ctx, width / 2, height * 0.07)
  drawRugbyPosts(ctx, width / 2, height * 0.93)
}

export const drawPlayer = (
  ctx: CanvasRenderingContext2D,
  player: Player,
  isSelected: boolean = false
) => {
  ctx.fillStyle = TEAM_COLORS[player.team]
  ctx.beginPath()
  ctx.arc(player.x, player.y, PLAYER_RADIUS, 0, Math.PI * 2)
  ctx.fill()

  if (isSelected) {
    ctx.strokeStyle = 'oklch(0.70 0.18 50)'
    ctx.lineWidth = 3
    ctx.stroke()
  }

  ctx.fillStyle = 'oklch(0.98 0 0)'
  ctx.font = '900 16px Inter'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(player.number.toString(), player.x, player.y)
}

export const drawBall = (
  ctx: CanvasRenderingContext2D,
  ball: Ball,
  isSelected: boolean = false
) => {
  ctx.fillStyle = 'oklch(0.98 0 0)'
  ctx.beginPath()
  ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = 'oklch(0.20 0 0)'
  ctx.lineWidth = 2
  ctx.stroke()

  if (isSelected) {
    ctx.strokeStyle = 'oklch(0.70 0.18 50)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, BALL_RADIUS + 3, 0, Math.PI * 2)
    ctx.stroke()
  }
}

export const drawEmoji = (
  ctx: CanvasRenderingContext2D,
  emoji: Emoji,
  isSelected: boolean = false
) => {
  ctx.font = `${EMOJI_SIZE}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emoji.emoji, emoji.x, emoji.y)

  if (isSelected) {
    ctx.strokeStyle = 'oklch(0.70 0.18 50)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(emoji.x, emoji.y, EMOJI_SIZE / 2 + 3, 0, Math.PI * 2)
    ctx.stroke()
  }
}

export const isPointInPlayer = (x: number, y: number, player: Player): boolean => {
  const dx = x - player.x
  const dy = y - player.y
  return Math.sqrt(dx * dx + dy * dy) <= PLAYER_RADIUS
}

export const isPointInBall = (x: number, y: number, ball: Ball): boolean => {
  const dx = x - ball.x
  const dy = y - ball.y
  return Math.sqrt(dx * dx + dy * dy) <= BALL_RADIUS
}

export const isPointInEmoji = (x: number, y: number, emoji: Emoji): boolean => {
  const dx = x - emoji.x
  const dy = y - emoji.y
  return Math.sqrt(dx * dx + dy * dy) <= EMOJI_SIZE / 2
}

export const addTeamInLine = (frame: Frame, team: 'blue' | 'red', playerCount: number = 15): Frame => {
  const y = team === 'red' ? FIELD_HEIGHT * 0.4 : FIELD_HEIGHT * 0.1
  const spacing = FIELD_WIDTH / (playerCount + 1)
  
  const newPlayers = Array.from({ length: playerCount }, (_, i) => ({
    id: crypto.randomUUID(),
    number: i + 1,
    team,
    x: spacing * (i + 1),
    y
  }))
  
  const existingPlayers = frame.players.filter(p => p.team !== team)
  
  return {
    ...frame,
    players: [...existingPlayers, ...newPlayers]
  }
}
