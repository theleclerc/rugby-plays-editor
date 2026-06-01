import { CropRegion, ViewPreset } from './types'

// Field coordinates derive from drawRugbyField in canvas-utils.ts:
// - top try line at y = FIELD_HEIGHT * 0.07 ≈ 110
// - bottom try line at y = FIELD_HEIGHT * 0.93 ≈ 1463
// - pitch length 100m → 13.53 px/m vertical
// - pitch width  70m  → 16.86 px/m horizontal
// "Attack direction" is upward (toward y=0), per the existing examples.
export const VIEW_PRESET_REGIONS: Record<Exclude<ViewPreset, 'full' | 'custom'>, CropRegion> = {
  // Touchline → ~32m in (almost half-width); spans from above the attacking
  // try line down to ~47m, wide enough to cover both 22m and 40m lines of
  // touch and leave room for backs setting up across the field.
  'lineout-left': { x: 0, y: 200, width: 540, height: 550 },
  'lineout-right': { x: 640, y: 200, width: 540, height: 550 },
  // Full width, between the two 22m lines.
  'half-22-22': { x: 0, y: 400, width: 1180, height: 770 },
  // Full width, attacking half (top half including in-goal).
  'half-attack': { x: 0, y: 0, width: 1180, height: 790 },
  // Right half, 10m/40m line forward to attacking try line.
  'right-channel': { x: 590, y: 0, width: 590, height: 655 },
}

export const VIEW_PRESET_LABELS: Record<ViewPreset, string> = {
  'full': 'Full pitch',
  'lineout-left': 'Lineout (left)',
  'lineout-right': 'Lineout (right)',
  'half-22-22': '22m to 22m',
  'half-attack': 'Attacking half',
  'right-channel': 'Right channel',
  'custom': 'Custom',
}

export function regionForPreset(preset: ViewPreset, custom?: CropRegion): CropRegion | undefined {
  if (preset === 'full') return undefined
  if (preset === 'custom') return custom
  return VIEW_PRESET_REGIONS[preset]
}
