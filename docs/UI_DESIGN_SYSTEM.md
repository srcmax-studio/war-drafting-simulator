# Aeonfront UI Design System

## Product character

The interface combines a modern strategy command surface with restrained eastern historical fantasy. It uses dark neutral canvases, copper and cinnabar accents, blue-gray secondary surfaces, and compact information density. Decoration must support hierarchy and game state rather than compete with it.

## Semantic color tokens

All shared colors live in `app/css/main.css`. Components use semantic variables rather than introducing page-specific palettes.

| Role | Variables |
| --- | --- |
| Canvas and elevation | `--color-bg-canvas`, `--color-bg-elevated`, `--color-bg-overlay` |
| Surfaces | `--color-surface-primary`, `--color-surface-secondary` |
| Text | `--color-text-primary`, `--color-text-secondary`, `--color-text-muted` |
| Brand accents | `--color-gold`, `--color-copper`, `--color-cinnabar`, `--color-jade`, `--color-blue-gray` |
| Feedback | `--color-success`, `--color-warning`, `--color-danger`, `--color-info` |
| Front control | `--color-front-own`, `--color-front-enemy`, `--color-front-tied` |

Victory, defeat, ownership, and warnings always include a label or icon in addition to color.

## Type and numbers

- Display and page titles use the system serif stack through `--font-display`.
- Body copy and controls use the system UI stack through `--font-body`.
- Turn, power, cost, timer, stake, and latency values use `--font-numeric`.
- Compact panels keep headings close to body scale; display sizing is reserved for home and result heroes.
- Letter spacing remains zero. Long labels wrap rather than shrink below readable sizes.

## Space, shape, and layout

Spacing follows a 4 px and 8 px rhythm. Page content is constrained by `--content-max`; full-width bands remain unframed. Repeated records may use cards, but sections do not become nested cards. Interactive controls provide at least a 44 px touch target on narrow viewports. Corners remain 8 px or smaller.

The seven release viewports are 1920x1080, 1440x900, 1280x720, 1024x768, 768x1024, 430x932, and 390x844. Fixed-format boards, card slots, icon buttons, and numeric counters use stable tracks or aspect ratios so dynamic content cannot shift their neighbors.

## Component ownership

| Component | Responsibility |
| --- | --- |
| `AppShell` | Global navigation, route transitions, delegated interface sound |
| `GameButton`, `IconButton` | Commands, variants, focus, disabled and busy states |
| `GamePanel`, `GlassPanel` | Tool and information surfaces |
| `SectionHeader`, `StatusBadge` | Section hierarchy and compact state labels |
| `PlayerAvatar`, `ServerStatusBadge` | Player and connection identity |
| `RoomCard`, `DeckSelector` | Repeated lobby and deck choices |
| `Modal`, `Drawer`, `ConfirmDialog` | Focused overlays and destructive confirmation |
| `Tooltip`, `ToastHost` | Non-blocking help and feedback |
| `LoadingSkeleton`, `EmptyState`, `ErrorState` | Loading, empty, and recoverable failure states |
| `ProgressRing`, `VolumeControl` | Numeric progress and audio adjustment |

Focus rings are never removed. Dialogs carry a title and explicit close path. Toasts use a live region. Icon-only commands have an accessible name and tooltip.

## Motion and contrast modes

`data-motion` selects normal, fast, instant, or reduced presentation. `data-effects` selects high, balanced, or low ambient detail. The system honors `prefers-reduced-motion`; essential state changes remain visible without spatial animation. High-contrast mode strengthens text, focus, and ownership boundaries without changing layout.
