import { Frame, CropRegion } from './types'

export interface ProjectData {
  frames: Frame[]
  cropRegion?: CropRegion
}

export function exportProject(frames: Frame[], cropRegion?: CropRegion): string {
  const projectData: ProjectData = {
    frames: frames.map(frame => ({
      id: frame.id,
      players: frame.players.map(p => ({
        id: p.id,
        number: p.number,
        team: p.team,
        x: p.x,
        y: p.y
      })),
      ball: frame.ball ? {
        id: frame.ball.id,
        x: frame.ball.x,
        y: frame.ball.y
      } : null,
      emojis: frame.emojis.map(e => ({
        id: e.id,
        emoji: e.emoji,
        x: e.x,
        y: e.y
      }))
    })),
    cropRegion
  }
  
  return JSON.stringify(projectData, null, 2)
}

export function importProject(jsonString: string): { frames: Frame[]; cropRegion?: CropRegion } {
  try {
    const projectData: ProjectData = JSON.parse(jsonString)
    
    if (!projectData.frames || !Array.isArray(projectData.frames)) {
      throw new Error('Invalid project format')
    }
    
    return {
      frames: projectData.frames,
      cropRegion: projectData.cropRegion
    }
  } catch (error) {
    throw new Error('Failed to parse project file', { cause: error })
  }
}

export function downloadProjectFile(frames: Frame[], cropRegion?: CropRegion, filename: string = 'rugby-project.json') {
  const jsonString = exportProject(frames, cropRegion)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}
