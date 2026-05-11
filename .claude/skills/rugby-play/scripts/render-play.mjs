#!/usr/bin/env node
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, basename, join, extname, resolve } from 'node:path'
import { createCanvas } from '@napi-rs/canvas'

const FIELD_WIDTH = 1180
const FIELD_HEIGHT = 1573
const PLAYER_RADIUS = 18 * 0.7
const BALL_RADIUS = 12 * 0.7
const EMOJI_SIZE = 24 * 0.7

const TEAM_COLORS = { red: '#dc2626', blue: '#2563eb' }
const FIELD_COLOR = '#3d7a40'
const LINE_COLOR = '#ffffff'

const LINES = [
  { yFrac: 0.05 }, { yFrac: 0.235 }, { yFrac: 0.5 },
  { yFrac: 0.765 }, { yFrac: 0.95 },
]

function drawPosts(ctx, x, y) {
  const postHeight = 56, postSpacing = 24, crossbarOffset = 28
  ctx.strokeStyle = LINE_COLOR
  ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(x - postSpacing / 2, y); ctx.lineTo(x - postSpacing / 2, y - postHeight); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + postSpacing / 2, y); ctx.lineTo(x + postSpacing / 2, y - postHeight); ctx.stroke()
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(x - postSpacing / 2, y - crossbarOffset); ctx.lineTo(x + postSpacing / 2, y - crossbarOffset); ctx.stroke()
}

function drawField(ctx, w, h) {
  ctx.fillStyle = FIELD_COLOR
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = LINE_COLOR
  ctx.lineWidth = 2
  ctx.strokeRect(0, 0, w, h)
  for (const line of LINES) {
    const y = line.yFrac * h
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
  }
  drawPosts(ctx, w / 2, h * 0.07)
  drawPosts(ctx, w / 2, h * 0.93)
}

function drawPlayer(ctx, p) {
  ctx.fillStyle = TEAM_COLORS[p.team] || '#888'
  ctx.beginPath()
  ctx.arc(p.x, p.y, PLAYER_RADIUS, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 22px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(p.number), p.x, p.y)
}

function drawBall(ctx, b) {
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(b.x, b.y, BALL_RADIUS, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#222222'
  ctx.lineWidth = 2
  ctx.stroke()
}

function drawEmoji(ctx, e) {
  ctx.font = `${EMOJI_SIZE}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(e.emoji, e.x, e.y)
}

function renderFrame(frame, scale) {
  const w = FIELD_WIDTH * scale
  const h = FIELD_HEIGHT * scale
  const canvas = createCanvas(w, h)
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)
  drawField(ctx, FIELD_WIDTH, FIELD_HEIGHT)
  for (const p of frame.players) drawPlayer(ctx, p)
  if (frame.ball) drawBall(ctx, frame.ball)
  for (const e of frame.emojis || []) drawEmoji(ctx, e)
  return canvas.toBuffer('image/png')
}

function parseArgs(argv) {
  const args = { input: null, out: null, scale: 0.5 }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--out') args.out = argv[++i]
    else if (a === '--scale') {
      const v = parseFloat(argv[++i])
      if (v > 0) args.scale = v
    }
    else if (!args.input) args.input = a
  }
  return args
}

function main() {
  const argv = process.argv.slice(2)
  if (argv.length === 0) {
    console.error('Usage: render-play.mjs <play.json> [--out <dir>] [--scale <n>]')
    process.exit(1)
  }
  const { input, out, scale } = parseArgs(argv)
  const inputPath = resolve(input)
  const inputDir = dirname(inputPath)
  const inputBase = basename(inputPath, extname(inputPath))
  const outDir = out || join(inputDir, `${inputBase}-renders`)

  const data = JSON.parse(readFileSync(inputPath, 'utf-8'))
  const frames = data.frames || (Array.isArray(data) ? data : [data])

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

  for (let i = 0; i < frames.length; i++) {
    const png = renderFrame(frames[i], scale)
    const fp = join(outDir, `${inputBase}-frame-${i + 1}.png`)
    writeFileSync(fp, png)
    console.log(`Wrote ${fp}`)
  }
}

main()
