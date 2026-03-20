import { Tool, Team } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  Hand, 
  Circle, 
  Basketball, 
  Smiley, 
  Trash,
  VideoCamera,
  Users,
  FloppyDisk,
  FolderOpen,
  DownloadSimple,
  UploadSimple,
  CaretDown,
  Crop
} from '@phosphor-icons/react'

interface ToolbarProps {
  tool: Tool
  onToolChange: (tool: Tool) => void
  selectedTeam: Team
  onTeamChange: (team: Team) => void
  selectedNumber: number
  onNumberChange: (number: number) => void
  selectedEmoji: string
  onEmojiChange: (emoji: string) => void
  onExport: () => void
  onAddTeamLine?: (team: Team) => void
  onSaveFrame: () => void
  onLoadFrame: () => void
  onSaveProject: () => void
  onLoadProject: () => void
  onSaveProjectLocally: () => void
  onLoadProjectLocally: () => void
}

const COMMON_EMOJIS = ['🏉', '⚡', '💥', '❌', '✓', '⭐', '🎯', '💪', '🔥', '👊']

export const Toolbar = ({
  tool,
  onToolChange,
  selectedTeam,
  onTeamChange,
  selectedNumber,
  onNumberChange,
  selectedEmoji,
  onEmojiChange,
  onExport,
  onAddTeamLine,
  onSaveFrame,
  onLoadFrame,
  onSaveProject,
  onLoadProject,
  onSaveProjectLocally,
  onLoadProjectLocally
}: ToolbarProps) => {
  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-2 p-3 bg-card rounded-lg border border-border shadow-sm">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={tool === 'select' ? 'default' : 'outline'}
              size="icon"
              onClick={() => onToolChange('select')}
            >
              <Hand weight={tool === 'select' ? 'fill' : 'regular'} className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Select & Move</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={tool === 'player' ? 'default' : 'outline'}
              size="icon"
              onClick={() => onToolChange('player')}
            >
              <Circle weight={tool === 'player' ? 'fill' : 'regular'} className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add Player</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={tool === 'ball' ? 'default' : 'outline'}
              size="icon"
              onClick={() => onToolChange('ball')}
            >
              <Basketball weight={tool === 'ball' ? 'fill' : 'regular'} className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add Ball</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={tool === 'emoji' ? 'default' : 'outline'}
              size="icon"
              onClick={() => onToolChange('emoji')}
            >
              <Smiley weight={tool === 'emoji' ? 'fill' : 'regular'} className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add Emoji</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={tool === 'delete' ? 'destructive' : 'outline'}
              size="icon"
              onClick={() => onToolChange('delete')}
            >
              <Trash weight={tool === 'delete' ? 'fill' : 'regular'} className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete Object</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={tool === 'crop' ? 'default' : 'outline'}
              size="icon"
              onClick={() => onToolChange('crop')}
            >
              <Crop weight={tool === 'crop' ? 'fill' : 'regular'} className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Crop Region</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-8" />

        {tool === 'player' && (
          <>
            <Select value={selectedTeam} onValueChange={(value: Team) => onTeamChange(value)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blue">Blue Team</SelectItem>
                <SelectItem value="red">Red Team</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedNumber.toString()} onValueChange={(value) => onNumberChange(parseInt(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 15 }, (_, i) => i + 1).map(num => (
                  <SelectItem key={num} value={num.toString()}>
                    #{num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        {tool === 'emoji' && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="text-xl px-4">
                {selectedEmoji}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="grid grid-cols-5 gap-2">
                {COMMON_EMOJIS.map(emoji => (
                  <Button
                    key={emoji}
                    variant={selectedEmoji === emoji ? 'default' : 'outline'}
                    className="text-xl h-12"
                    onClick={() => onEmojiChange(emoji)}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        <div className="flex-1" />

        {onAddTeamLine && tool === 'player' && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  className="gap-2"
                  onClick={() => onAddTeamLine(selectedTeam)}
                >
                  <Users weight="fill" className="w-5 h-5" />
                  Add {selectedTeam === 'blue' ? 'Blue' : 'Red'} Line
                </Button>
              </TooltipTrigger>
              <TooltipContent>Place all {selectedTeam === 'blue' ? 'blue' : 'red'} team players in a horizontal line</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-8" />
          </>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <FloppyDisk weight="fill" className="w-5 h-5" />
              Save / Export
              <CaretDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onSaveFrame}>
              <FloppyDisk weight="fill" className="w-4 h-4 mr-2" />
              Save Frame
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSaveProjectLocally}>
              <FloppyDisk weight="fill" className="w-4 h-4 mr-2" />
              Save Project
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSaveProject}>
              <DownloadSimple weight="fill" className="w-4 h-4 mr-2" />
              Export JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExport}>
              <VideoCamera weight="fill" className="w-4 h-4 mr-2" />
              Export Video
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <FolderOpen weight="fill" className="w-5 h-5" />
              Load / Import
              <CaretDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onLoadFrame}>
              <FolderOpen weight="fill" className="w-4 h-4 mr-2" />
              Load Frame
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onLoadProjectLocally}>
              <FolderOpen weight="fill" className="w-4 h-4 mr-2" />
              Load Project
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLoadProject}>
              <UploadSimple weight="fill" className="w-4 h-4 mr-2" />
              Import JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  )
}
