export type Team = 'blue' | 'red'

export interface Player {
  id: string
  number: number
  team: Team
  x: number
  y: number
}

export interface Ball {
  id: string
  x: number
  y: number
}

export interface Emoji {
  id: string
  emoji: string
  x: number
  y: number
}

export interface CropRegion {
  x: number
  y: number
  width: number
  height: number
}

export interface Frame {
  id: string
  players: Player[]
  ball: Ball | null
  emojis: Emoji[]
}

export type Tool = 'select' | 'player' | 'ball' | 'emoji' | 'delete' | 'crop'

export interface ExportSettings {
  frameDuration: number
  interpolationFrames: number
  fps: number
}

export interface SavedFrame {
  id: string
  name: string
  frame: Frame
  createdAt: number
}

export interface SavedProject {
  id: string
  name: string
  frames: Frame[]
  cropRegion?: CropRegion
  createdAt: number
}
