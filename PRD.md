# Planning Guide

A rugby play designer that enables coaches and players to sketch, animate, and share tactical combinations through frame-based sequencing on a rugby field canvas.

**Experience Qualities**:
1. **Tactile** - Direct manipulation of players on the field should feel immediate and precise, like moving pieces on a tactical board
2. **Professional** - Clean, sport-focused interface that coaches would confidently use for training sessions
3. **Fluid** - Smooth transitions between frames create natural movement flow when exported as video

**Complexity Level**: Light Application (multiple features with basic state)
This is a specialized tool with core sketching, frame management, and export features. State management involves player positions across frames, but doesn't require complex data relationships or multiple views beyond the main canvas.

## Essential Features

**Frame Management**
- Functionality: Create, navigate, duplicate, and delete frames in a sequence
- Purpose: Build multi-step play progressions
- Trigger: User clicks "New Frame" button or uses frame navigation controls
- Progression: Click new frame → system duplicates current frame → user modifies positions → repeat
- Success criteria: Frames display in timeline, new frames inherit previous state, navigation works smoothly

**Player Placement**
- Functionality: Add, position, and label players (circles with numbers 1-15) on the rugby field
- Purpose: Represent team positions and formations
- Trigger: User clicks "Add Player" then clicks field location
- Progression: Select add player → choose number → click field position → player appears → drag to reposition or click to edit number
- Success criteria: Players can be placed anywhere, dragged smoothly, numbered correctly, and visually distinct by team

**Ball & Emoji Placement**
- Functionality: Add a ball or custom emoji markers to the field
- Purpose: Show ball movement and special markers (contact points, decision moments)
- Trigger: User selects ball/emoji tool and clicks field
- Progression: Select ball/emoji tool → (if emoji: choose from picker) → click field position → marker appears → drag to reposition
- Success criteria: Only one ball allowed per frame, emojis can be multiple, all draggable

**Rugby Field Canvas**
- Functionality: Accurate rugby field rendering with lines, goal posts, and proper proportions
- Purpose: Provide realistic tactical context
- Trigger: Loads automatically as canvas background
- Progression: App loads → field renders with proper markings → remains visible as backdrop for all interactions
- Success criteria: Field shows try lines, 22m lines, 10m line, goal posts; scales responsively

**Video Export**
- Functionality: Generate MP4/WebM video with linear interpolation between frames, with optional crop region
- Purpose: Share plays as animated sequences for analysis and training, focusing on specific field areas
- Trigger: User clicks "Export Video" button
- Progression: Click export → set frame duration → system interpolates positions → renders frames (cropped if region defined) → downloads video file
- Success criteria: Video shows smooth transitions, objects appear/disappear with fade, maintains aspect ratio, respects crop region if set

**Crop Region Selection**
- Functionality: Define a rectangular region of the field to export as video
- Purpose: Focus video on specific field areas and reduce file size
- Trigger: User selects "Crop" tool and drags on canvas
- Progression: Select crop tool → drag rectangle on field → release to set region → crop indicator displays → export uses cropped region
- Success criteria: Crop region shows on canvas with orange outline, displays dimensions, can be cleared, persists with project saves

## Edge Case Handling

- **Empty frames**: Show helpful prompt to add players when frame is empty
- **Duplicate numbers**: Allow duplicate numbers but visually warn user with subtle indicator
- **Object removal**: Click player/object + delete key, or dedicated remove mode
- **Frame deletion protection**: Require confirmation when deleting frames, prevent deleting last frame
- **Export with one frame**: Still generates video (static display), warns user it won't be animated
- **Off-canvas dragging**: Constrain objects to field boundaries during drag operations

## Design Direction

The design should evoke the feeling of a professional coaching tool - clean, focused, and tactical. Think sports analytics software meets creative canvas: precise grid-based layouts, bold team colors (blues/reds), and minimal distractions from the field itself. The interface should feel like a digital tactical board with the polish of modern design tools.

## Color Selection

The color scheme centers on authentic rugby field green with bold team colors for clarity.

- **Primary Color**: Deep Rugby Green `oklch(0.45 0.12 145)` - Represents the field, grounding the entire interface in the sport's context
- **Secondary Colors**: 
  - Team Blue `oklch(0.50 0.20 250)` for one team
  - Team Red `oklch(0.55 0.22 25)` for opposing team
  - Clean White `oklch(0.98 0 0)` for field markings and UI chrome
- **Accent Color**: Vibrant Orange `oklch(0.70 0.18 50)` - Calls attention to active tools, selected objects, and export button
- **Foreground/Background Pairings**:
  - Background (Light Gray #F5F5F5 / oklch(0.97 0 0)): Dark Text (oklch(0.20 0 0)) - Ratio 12.6:1 ✓
  - Team Blue (oklch(0.50 0.20 250)): White text (oklch(0.98 0 0)) - Ratio 5.2:1 ✓
  - Team Red (oklch(0.55 0.22 25)): White text (oklch(0.98 0 0)) - Ratio 4.8:1 ✓
  - Accent Orange (oklch(0.70 0.18 50)): Dark text (oklch(0.20 0 0)) - Ratio 7.1:1 ✓

## Font Selection

Typography should communicate clarity and authority - the tool is precise and professional, not playful.

- **Typographic Hierarchy**:
  - App Title: Inter Bold / 24px / -0.02em letter spacing
  - Player Numbers: Inter Black / 16px / -0.01em letter spacing (highly legible on small circles)
  - Frame Labels: Inter Medium / 14px / normal letter spacing
  - Tool Labels: Inter Regular / 14px / normal letter spacing
  - Button Text: Inter Semibold / 15px / normal letter spacing

## Animations

Animations should reinforce the tactical, deliberate nature of play design - smooth but purposeful, never frivolous.

- Frame transitions: 200ms ease-out when switching between frames
- Player drag: No animation during drag (immediate feedback), snap to final position with 150ms ease
- Object appearance: 200ms scale + fade in (0.5 → 1.0 scale)
- Video export progress: Smooth indeterminate progress bar during rendering
- Tool selection: 100ms background color shift to show active state

## Component Selection

- **Components**:
  - `Button` (primary actions like "New Frame", "Export Video", tool selection)
  - `Card` (frame thumbnails in timeline)
  - `Dialog` (export settings, confirm delete operations)
  - `Slider` (adjust frame duration for export)
  - `Popover` (emoji picker, player number selection)
  - `ScrollArea` (frame timeline when many frames exist)
  - `Separator` (divide toolbar sections)
  - `Tooltip` (tool hints on hover)
  - `Tabs` (switch between teams for player placement)
  
- **Customizations**:
  - Custom canvas component using HTML5 Canvas API for field rendering and object manipulation
  - Custom player circle component (SVG-based for crisp rendering at any zoom)
  - Custom frame thumbnail renderer (mini canvas showing frame state)
  - Video encoder using MediaRecorder API or canvas-to-video library
  
- **States**:
  - Buttons: Default (white/ghost), Hover (subtle bg shift), Active (accent color), Disabled (muted, 50% opacity)
  - Player circles: Default (team color), Hover (brightness +10%), Selected (accent border ring), Dragging (shadow, 50% opacity)
  - Frame cards: Default (white), Current (accent border), Hover (shadow elevation)
  
- **Icon Selection**:
  - Plus (add player/frame)
  - Trash (delete objects)
  - VideoCamera (export)
  - ArrowLeft/ArrowRight (frame navigation)
  - Users (team management)
  - Circle (player tool)
  - Smiley (emoji tool)
  - Download (export download)
  - Crop (crop region tool)
  - FloppyDisk (save operations)
  - FolderOpen (load operations)
  
- **Spacing**:
  - Canvas padding: `p-4`
  - Toolbar gaps: `gap-2` for tool groups, `gap-4` between sections
  - Frame timeline: `gap-3` between thumbnails
  - Player circles: minimum 32px diameter for touch targets
  
- **Mobile**:
  - Stack toolbar vertically on left side for mobile portrait
  - Frame timeline moves to bottom horizontal scroll
  - Touch gestures: tap to select, long-press to edit, pinch to zoom field
  - Larger touch targets (48px) for player placement
  - Export simplified to single "Share" button using Web Share API
