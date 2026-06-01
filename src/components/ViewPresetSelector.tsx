import { ViewPreset } from '@/lib/types'
import { VIEW_PRESET_LABELS } from '@/lib/view-presets'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ViewPresetSelectorProps {
  value: ViewPreset
  onChange: (preset: ViewPreset) => void
  hasCustom: boolean
}

const ORDER: ViewPreset[] = [
  'full',
  'lineout-left',
  'lineout-right',
  'half-22-22',
  'half-attack',
  'right-channel',
]

export function ViewPresetSelector({ value, onChange, hasCustom }: ViewPresetSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">View:</span>
      <Select value={value} onValueChange={(v) => onChange(v as ViewPreset)}>
        <SelectTrigger className="w-44 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ORDER.map((p) => (
            <SelectItem key={p} value={p}>
              {VIEW_PRESET_LABELS[p]}
            </SelectItem>
          ))}
          {hasCustom && (
            <SelectItem value="custom">{VIEW_PRESET_LABELS.custom}</SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  )
}
