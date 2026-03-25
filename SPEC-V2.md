# CavesApp V2 — "Punk Cave" Infinite Canvas Specification

> **Caves** — Enter the underground.

---

## 1. Executive Summary

CavesApp V2 is a complete visual and UX overhaul. The app becomes a **single-screen infinite canvas** where event flyers are scattered like posters on the wall of an underground venue. Users explore by panning and zooming freely in all directions — like navigating Figma or Miro, not scrolling a social feed.

The backend (Supabase, PostGIS, Auth, Storage, RLS, API routes) remains untouched.

### What Changes

| Area | V1 (Current) | V2 (Punk Cave) |
|------|-------------|----------------|
| **Core UX** | Vertical swipe feed (TikTok-style) | Infinite canvas — pan/zoom in all directions |
| **Screen Model** | Multiple screens with navigation | Single screen — canvas IS the experience |
| **Visual Identity** | Clean dark (#0A0A0A), red accent | Deep black (#050505), grain texture, neon-punk accents |
| **Typography** | Inter + Space Grotesk | Space Mono (display) + Inter (body) |
| **Interaction (mobile)** | Swipe up/down, tap to detail | Tap-hold to pan/drag, tap flyer for detail |
| **Interaction (web)** | Grid fallback | Click-drag to pan, scroll wheel to zoom, click flyer for detail |
| **Navigation** | Bottom nav bar | No nav bar — floating header only, canvas takes full viewport |
| **Header** | Standard top bar | Floating black bar, ~80% opacity, glassmorphism blur, logo centered |

### What Stays (Untouched)

- Supabase backend: tables, migrations, RLS policies, storage buckets
- Auth system: login, signup, OAuth, session management, middleware
- API routes: `/api/events`, `/api/events/[id]`, `/api/events/[id]/view`, `/api/upload`, `/api/geocode`
- Event detail page: SSR + OG meta for social sharing
- Upload functionality: image compression, form, geocoding
- Profile page: user data, avatar, events list
- Logo: kept as-is (Pinyon Script "Caves")
- Database schema: `profiles`, `categories`, `events` tables

### Key Principles

1. **Design-tool feel** — smooth pan/zoom like Figma or Miro, not a social feed
2. **Flyers are vertical** — poster/announcement style, scattered organically on the canvas
3. **No feed, no scroll** — the canvas IS the experience. Navigate freely in all directions.
4. **Single screen** — header is a floating black bar with opacity, logo centered
5. **No bottom nav** — the canvas takes the full viewport
6. **Flyers come from Supabase Storage** — images stored in a `flyers` bucket
7. **Database tracks flyer metadata** — position on canvas, image URL, title, etc.

---

## 2. Visual Identity — "Punk Cave"

### 2.1 Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--cave-black` | `#050505` | Primary background — the void |
| `--cave-dark` | `#0A0A0A` | Elevated surfaces, cards |
| `--cave-stone` | `#141414` | Secondary surfaces |
| `--cave-rock` | `#1E1E1E` | Borders, dividers |
| `--cave-ash` | `#2A2A2A` | Input backgrounds, tertiary |
| `--cave-smoke` | `#4A4A4A` | Disabled states, subtle borders |
| `--cave-fog` | `#8A8A8A` | Secondary text, muted content |
| `--cave-light` | `#E0E0E0` | Primary text |
| `--cave-white` | `#F5F5F5` | High-emphasis text, headings |
| `--neon-green` | `#39FF14` | Primary accent — CTAs, active states |
| `--neon-green-dim` | `#39FF14/20` | Subtle green highlights |
| `--neon-orange` | `#FF6B2B` | Secondary accent — heat/calor, warnings |
| `--neon-pink` | `#FF2D7B` | Tertiary accent — notifications, badges |
| `--neon-glow` | `0 0 20px var(--neon-green)` | Box-shadow glow for focus/active |

**Rule**: Neon colors are used ONLY for interactive elements (buttons, links, focus rings, active states, heat effects). Never for backgrounds or large surfaces.

### 2.2 Typography

| Role | Font | Fallback | Weight |
|------|------|----------|--------|
| **Display / Headings** | `Space Mono` | `"Courier New", monospace` | 700 |
| **Body** | `Inter` | `system-ui, sans-serif` | 400, 500 |
| **UI Labels / Badges** | `Space Mono` | `monospace` | 400 |
| **Logo** | `Pinyon Script` (keep existing) | `cursive` | 400 |

**Why Space Mono**: Terminal/typewriter aesthetic that fits the punk underground vibe. Google Fonts, free, excellent readability at all sizes.

**Font Scale**:

| Element | Mobile | Desktop |
|---------|--------|---------|
| Display (h1) | 28px / 1.1 | 40px / 1.1 |
| Heading (h2) | 22px / 1.2 | 28px / 1.2 |
| Subheading (h3) | 18px / 1.3 | 22px / 1.3 |
| Body | 14px / 1.5 | 16px / 1.5 |
| Caption / Badge | 11px / 1.3 | 12px / 1.3 |
| Mono label | 11px / 1.2 | 12px / 1.2 |

### 2.3 Texture — Cave Wall Grain

A subtle noise/grain texture overlays the entire app background, simulating a cave wall surface.

**Implementation**: CSS `::after` pseudo-element on the `<body>` or root layout with an SVG noise filter.

```
Grain overlay specification:
- Method: SVG feTurbulence filter as base64 data URI in CSS background-image
- Opacity: 0.03-0.05 (very subtle — visible on large dark areas, invisible on content)
- Blend mode: overlay
- Position: fixed, covers full viewport
- Z-index: 1 (above bg, below all content)
- Pointer-events: none (does not intercept clicks)
- Performance: single composited layer, no JS, no re-renders
```

### 2.4 Borders & Shadows

| Element | Style |
|---------|-------|
| Card borders | 1px solid `--cave-rock` (#1E1E1E) |
| Focused input | 1px solid `--neon-green`, box-shadow `--neon-glow` |
| Elevated surface | No shadow — use border + slight bg difference |
| Active button | `--neon-green` bg, `--cave-black` text |
| Ghost button | Transparent bg, `--neon-green` border + text |
| Flyer shadows | `0 4px 20px rgba(0,0,0,0.6)` — subtle depth on canvas |

### 2.5 Iconography

- Style: Outlined stroke icons (consistent with current SVG icons)
- Weight: 1.5px stroke
- Default color: `--cave-fog`
- Active color: `--neon-green`

---

## 3. Core UX: Infinite Canvas

### 3.1 Concept

The entire app is a **single screen** with an infinite canvas. Event flyers (vertical poster images) are scattered across a dark void. Users navigate by panning and zooming freely in all directions — like moving around a Figma or Miro board, not scrolling a feed.

There is no feed. No scroll. No swipe. The canvas IS the experience.

### 3.2 Flyer Layout on Canvas

Flyers are positioned in an **organic scatter** — loosely structured with intentional randomness:

```
Algorithm: Organic scatter placement
1. Flyer positions are stored in the database (x, y coordinates)
2. When new flyers are added, assign positions using a spiral/grid seed algorithm:
   - Start from center (0, 0)
   - Place flyers outward in a loose grid pattern
   - Apply random offsets to each position:
     - X offset: random(-30px, +30px)
     - Y offset: random(-25px, +25px)
     - Rotation: random(-5deg, +5deg)
3. Result: organic feel — like posters scattered on a wall, not a rigid grid
4. Positions are persisted so every user sees the same layout
5. New flyers appear at the edges of the existing cluster
```

**Flyer card size on canvas**:
- Mobile: ~140px x 200px (portrait/poster ratio)
- Desktop: ~180px x 260px (portrait/poster ratio)
- All flyers maintain vertical poster aspect ratio

### 3.3 Floating Header

The header is the only persistent UI element besides the canvas itself.

```
Header specification:
- Position: fixed, top of screen, full width
- Background: #050505 with 80% opacity
- Backdrop filter: blur(12px) — glassmorphism effect
- Height: 48px (mobile), 56px (desktop)
- Z-index: above canvas and grain overlay
- Content: "Caves" logo centered (Pinyon Script font, --cave-white)
- Border-bottom: 1px solid --cave-rock at 50% opacity
- Does NOT obstruct canvas interaction — canvas starts behind the header
```

**No bottom nav.** The canvas occupies the full viewport. Any secondary actions (profile, upload, etc.) are accessed via the header or contextual UI.

### 3.4 Desktop Behavior

| Feature | Behavior |
|---------|----------|
| **Pan** | Click and drag anywhere on the canvas to pan in all directions |
| **Zoom** | Scroll wheel zooms in/out. Zoom targets cursor position. |
| **Hover** | Flyer scales up 1.05x, shows event title + date overlay |
| **Click** | Opens flyer detail expansion (see 3.6) |
| **Keyboard** | Arrow keys pan canvas. +/- zoom. Tab through flyers. Enter opens detail. Escape closes. |
| **Cursor** | Default: grab cursor. During drag: grabbing cursor. Over flyer: pointer. |

### 3.5 Mobile Behavior

| Feature | Behavior |
|---------|----------|
| **Pan** | Tap and hold, then drag to pan canvas in all directions |
| **Zoom** | Pinch to zoom in/out |
| **Tap** | Tap a flyer to open detail expansion (see 3.6) |
| **Inertia** | Pan has momentum/inertia on release — canvas continues gliding with friction decay |
| **Snap back** | Zoom past min/max snaps back with spring animation |
| **Min zoom** | 0.5x (see many flyers as thumbnails) |
| **Max zoom** | 2.0x (see flyer details clearly) |

### 3.6 Flyer Detail Expansion

When a user taps/clicks a flyer on the canvas:

```
Animation sequence (duration: ~400ms total):
1. All other flyers fade to 0.1 opacity (150ms ease-out)
2. Background darkens further toward pure black (150ms)
3. Selected flyer scales from canvas position to center-screen:
   - Scale: from canvas size to ~85vh height (maintain aspect ratio)
   - Position: animates from current canvas position to viewport center
   - Uses layoutId animation (Framer Motion shared layout)
4. Info overlay appears below/beside the expanded flyer:
   - Event title (Space Mono, neon-green)
   - Date + time
   - Venue name + distance
   - "Ver detalles" button → navigates to /event/[id]
   - Heat count badge
5. Tap outside or swipe down dismisses (reverse animation)
```

### 3.7 Canvas State Management

```
Canvas state (Zustand store):
- position: { x: number, y: number } — canvas offset (pan position)
- scale: number — zoom level (0.5 - 2.0)
- focusedFlyer: string | null — ID of expanded flyer
- flyers: FlyerOnCanvas[] — loaded flyers with positions
- loading: boolean
- viewport: { width: number, height: number } — for virtualization
```

```typescript
interface FlyerOnCanvas {
  id: string;
  imageUrl: string;
  title: string;
  date: string;
  venue: string;
  x: number;        // position on canvas
  y: number;        // position on canvas
  rotation: number;  // slight random rotation (±5deg)
  width: number;
  height: number;
  heatCount: number;
}
```

### 3.8 Virtualization

Only render flyers visible in the current viewport + a buffer zone. This is critical for performance with many flyers.

```
Virtualization strategy:
1. Calculate visible bounds from canvas position + scale + viewport size
2. Add buffer of 1.5x viewport in each direction
3. Only mount/render flyers whose bounding box intersects the buffered viewport
4. Unmount flyers that leave the buffer zone
5. On pan/zoom, recalculate visible set (throttled to 16ms — one frame)
6. Images use lazy loading: load when within 2x viewport bounds
```

### 3.9 Infinite Loading

- Load initial batch of ~30 flyers (nearest to canvas center)
- When user pans near the edge of loaded content, trigger `loadMore`
- New flyers appear with a fade-in + slight scale-up animation (200ms)
- Loading indicator: subtle pulsing dots at the edge of the loaded area

---

## 4. Database Changes

### 4.1 Flyer Canvas Positions

Flyer positions on the canvas are stored in the database so all users see the same layout.

**New migration**:
```sql
-- Add canvas position fields to events
ALTER TABLE events ADD COLUMN canvas_x float DEFAULT 0;
ALTER TABLE events ADD COLUMN canvas_y float DEFAULT 0;
ALTER TABLE events ADD COLUMN canvas_rotation float DEFAULT 0;

-- Index for spatial queries (loading flyers near a position)
CREATE INDEX idx_events_canvas_position ON events(canvas_x, canvas_y);
```

**Position assignment**: When a new flyer is uploaded, the server assigns a canvas position using a spiral placement algorithm. Positions are deterministic — not random per-client.

### 4.2 Heat System (Calor)

**New migration**:
```sql
-- New table: event_heat
CREATE TABLE event_heat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  session_id text, -- anonymous users tracked by session
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id),
  UNIQUE(event_id, session_id)
);

-- Add heat_count to events
ALTER TABLE events ADD COLUMN heat_count integer NOT NULL DEFAULT 0;

-- Index for counting
CREATE INDEX idx_event_heat_event ON event_heat(event_id);

-- RLS
ALTER TABLE event_heat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read heat" ON event_heat FOR SELECT USING (true);
CREATE POLICY "Authenticated users give heat" ON event_heat FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anonymous heat via session" ON event_heat FOR INSERT WITH CHECK (session_id IS NOT NULL AND user_id IS NULL);
```

**New API route**: `/api/events/[id]/heat` (POST)
- Toggles heat on/off for the user/session
- Updates `heat_count` on the events table via trigger or RPC
- Returns `{ heated: boolean, heat_count: number }`

### 4.3 Flyer Expiration

**New migration**:
```sql
-- Add expires_at column
ALTER TABLE events ADD COLUMN expires_at timestamptz;

-- Backfill: set expires_at to created_at + 7 days for existing events
UPDATE events SET expires_at = created_at + interval '7 days' WHERE expires_at IS NULL;

-- Make NOT NULL with default
ALTER TABLE events ALTER COLUMN expires_at SET NOT NULL;
ALTER TABLE events ALTER COLUMN expires_at SET DEFAULT (now() + interval '7 days');
```

**Cleanup**: Supabase Edge Function or `pg_cron` runs daily, setting `status = 'expired'` for events past their `expires_at`.

---

## 5. Components

### 5.1 InfiniteCanvas

**Location**: `src/features/feed/components/infinite-canvas.tsx`

**Purpose**: The single-screen infinite canvas that IS the app experience.

**Dependencies**:
- `framer-motion` (already installed) — layout animations, spring physics, AnimatePresence
- `@use-gesture/react` (NEW) — drag, pinch, wheel gesture handling

**Props**:
```typescript
interface InfiniteCanvasProps {
  flyers: FlyerOnCanvas[];
  loading: boolean;
  onLoadMore: () => void;
  hasMore: boolean;
}
```

**Sub-components**:
- `CanvasViewport` — the pannable/zoomable container (CSS transforms on a div, NOT `<canvas>`)
- `CanvasFlyer` — individual flyer positioned on the canvas
- `FlyerExpansionOverlay` — the expanded flyer detail overlay

**Rendering approach**: HTML/CSS transforms. The canvas is a large `div` with `transform: translate(x, y) scale(s)`. Flyers are absolutely positioned children. This is NOT an HTML5 `<canvas>` element — it's DOM-based for accessibility and SSR compatibility.

**Accessibility**:
- Canvas container: `role="region"` with `aria-label="Event flyers canvas"`
- Each flyer: `role="button"` with `aria-label="{title} — {date} at {venue}"`
- Keyboard navigation: Tab through flyers, Enter to expand, Escape to close
- Reduced motion: disable inertia, use fade instead of scale animations

### 5.2 CanvasFlyer

**Location**: `src/features/feed/components/canvas-flyer.tsx`

**Purpose**: A single flyer card positioned on the infinite canvas.

**Visual**:
```
- Flyer image fills the card (object-cover, vertical poster ratio)
- Subtle dark gradient at bottom (30% height)
- Bottom overlay: event title (truncated, 1 line), date (short format)
- Top-right corner: heat count badge (flame + number, neon-orange)
- Border: 1px solid --cave-rock, rounded-lg
- Box shadow: 0 4px 20px rgba(0,0,0,0.6) — depth on the dark canvas
- Random rotation applied via CSS transform (±5deg, from database)
- On hover (desktop):
  - Scale 1.05x
  - Border transitions to --neon-green at 0.3 opacity
  - Shadow intensifies
```

### 5.3 FloatingHeader

**Location**: `src/shared/components/layout/floating-header.tsx`

**Purpose**: The only persistent UI element — a translucent bar at the top of the viewport.

**Visual**:
```
- Fixed position, top 0, full width
- Background: rgba(5, 5, 5, 0.8)
- Backdrop-filter: blur(12px)
- Height: 48px mobile, 56px desktop
- "Caves" logo centered (Pinyon Script, --cave-white)
- Border-bottom: 1px solid rgba(30, 30, 30, 0.5)
- Z-index: 50 (above canvas)
- Optional: small menu icon (hamburger) on the left for profile/upload access
```

### 5.4 Heat Button

**Location**: `src/features/feed/components/heat-button.tsx`

**Purpose**: Calor/heat toggle. Appears in the flyer expansion overlay.

**Visual effect on activation**:
```
Heat animation sequence:
1. Flyer border briefly glows neon-orange (300ms)
2. A flame SVG icon scales up from center (0 → 1.2 → 1.0)
3. Heat count increments with a number flip animation
4. Subtle orange pulse radiates outward (like heat waves)
5. If un-heating: reverse with cool-down effect (glow fades to gray)
```

**Display**: Heat count shown as a small badge on the flyer corner: `flame-icon + count` in neon-orange.

### 5.5 Grain Overlay

**Location**: `src/shared/components/layout/grain-overlay.tsx`

**Purpose**: Full-viewport noise texture overlay.

**Implementation**: Server component (no JS needed). Pure CSS with SVG filter.

```css
.grain-overlay {
  position: fixed;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  opacity: 0.04;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,..."); /* SVG feTurbulence */
  background-repeat: repeat;
}
```

---

## 6. Canvas Technical Implementation

### 6.1 Rendering Architecture

The canvas is NOT an HTML5 `<canvas>`. It is a DOM-based approach using CSS transforms:

```
Structure:
<div class="viewport">         <!-- fixed, overflow:hidden, full screen -->
  <div class="canvas-layer"    <!-- transform: translate(x,y) scale(s) -->
    style="transform: translate({panX}px, {panY}px) scale({zoom})">
    <div class="flyer" style="position:absolute; left:{x}px; top:{y}px; transform:rotate({r}deg)">
      <!-- flyer content -->
    </div>
    <!-- ...more flyers -->
  </div>
</div>
```

This approach:
- Works with Next.js SSR (DOM elements, not canvas API)
- Supports accessibility (real DOM nodes with ARIA attributes)
- Enables Framer Motion layout animations on individual flyers
- Uses GPU-accelerated CSS transforms for smooth 60fps pan/zoom

### 6.2 Gesture Handling

All gestures are handled by `@use-gesture/react`:

```typescript
// Conceptual — not final code
const bind = useGesture({
  onDrag: ({ offset: [x, y] }) => {
    setPosition({ x, y });
  },
  onPinch: ({ offset: [scale] }) => {
    setZoom(clamp(scale, 0.5, 2.0));
  },
  onWheel: ({ delta: [, dy] }) => {
    setZoom(prev => clamp(prev - dy * 0.001, 0.5, 2.0));
  },
}, {
  drag: {
    from: () => [position.x, position.y],
    filterTaps: true,  // distinguish tap from drag
  },
  pinch: {
    scaleBounds: { min: 0.5, max: 2.0 },
  },
});
```

**Inertia**: On drag release, the canvas continues gliding based on velocity. Friction coefficient: 0.95 (decays each frame). Implemented via Framer Motion's `useSpring` or `@use-gesture`'s built-in momentum.

### 6.3 Zoom Behavior

- Scroll wheel: zoom toward cursor position (not viewport center)
- Pinch: zoom toward pinch midpoint
- Zoom range: 0.5x (zoomed out, see many flyers) to 2.0x (zoomed in, see details)
- Zoom step per scroll tick: 0.1
- Spring config for zoom: `{ stiffness: 300, damping: 30, mass: 1 }`

---

## 7. Modified Existing Components

### 7.1 Root Layout (`src/app/layout.tsx`)

**Changes**:
- Replace `Space_Grotesk` with `Space_Mono` import from `next/font/google`
- Update body background from `#0A0A0A` to `#050505`
- Add `GrainOverlay` component inside body
- Update CSS variables in `globals.css` to new palette
- Keep `Inter` for body text
- Keep `Pinyon Script` for logo

### 7.2 Global CSS (`src/app/globals.css`)

**Changes**:
- Replace all CSS custom properties with new palette (section 2.1)
- Add grain overlay styles
- Add neon glow utility classes
- Add animation keyframes for heat effect, flyer expansion
- Canvas-specific styles (cursor states, viewport reset)

### 7.3 Main Page (`src/app/(main)/page.tsx`)

**Changes**:
- Replace feed component with `InfiniteCanvas`
- Remove bottom nav
- Add `FloatingHeader`
- Full viewport layout (no padding, no scroll)

### 7.4 Auth Pages

**Changes (visual only — flow stays identical)**:
- Background: `--cave-black` with grain overlay
- Form card: `--cave-dark` bg, `--cave-rock` border
- Input fields: `--cave-ash` bg, neon-green focus ring
- Submit button: neon-green bg, black text, glow on hover
- OAuth button: ghost style with neon-green border
- Logo: keep Pinyon Script, add subtle neon-green glow
- Error messages: `--neon-pink` text

### 7.5 Event Detail (`src/app/event/[id]/page.tsx`)

**Changes**:
- Background: `--cave-black` with grain
- Metadata text: `--cave-fog` for labels, `--cave-light` for values
- Add heat count display and heat button
- Category badge: neon-green bg instead of red
- Keep SSR + OG meta exactly as-is

### 7.6 Shared UI Components

| Component | Changes |
|-----------|---------|
| `button.tsx` | New variants: `neon` (green bg), `ghost-neon` (green border), `danger` (pink). Remove red accent. |
| `input.tsx` | Dark bg (`--cave-ash`), green focus ring with glow, placeholder in `--cave-smoke` |
| `card.tsx` | Dark bg (`--cave-dark`), `--cave-rock` border, no shadow |
| `loading-spinner.tsx` | Neon-green color, pulsing glow effect |

---

## 8. New Dependencies

| Package | Version | Purpose | Size Impact |
|---------|---------|---------|-------------|
| `@use-gesture/react` | `^10.3` | Pan, pinch, wheel gesture handling for canvas | ~15KB gzipped |

**Already installed** (no changes needed):
- `framer-motion` ^12.38.0 — animations, layout transitions, spring physics
- `clsx` + `tailwind-merge` — class utilities

---

## 9. Tailwind Theme Configuration

### 9.1 CSS Custom Properties (`globals.css`)

```css
@import "tailwindcss";

:root {
  /* Cave palette */
  --cave-black: #050505;
  --cave-dark: #0A0A0A;
  --cave-stone: #141414;
  --cave-rock: #1E1E1E;
  --cave-ash: #2A2A2A;
  --cave-smoke: #4A4A4A;
  --cave-fog: #8A8A8A;
  --cave-light: #E0E0E0;
  --cave-white: #F5F5F5;

  /* Neon accents */
  --neon-green: #39FF14;
  --neon-orange: #FF6B2B;
  --neon-pink: #FF2D7B;
}
```

### 9.2 Tailwind v4 Theme Extension

```css
@theme {
  --color-cave-black: #050505;
  --color-cave-dark: #0A0A0A;
  --color-cave-stone: #141414;
  --color-cave-rock: #1E1E1E;
  --color-cave-ash: #2A2A2A;
  --color-cave-smoke: #4A4A4A;
  --color-cave-fog: #8A8A8A;
  --color-cave-light: #E0E0E0;
  --color-cave-white: #F5F5F5;
  --color-neon-green: #39FF14;
  --color-neon-orange: #FF6B2B;
  --color-neon-pink: #FF2D7B;

  --font-mono: "Space Mono", "Courier New", monospace;
  --font-display: "Space Mono", "Courier New", monospace;
  --font-body: "Inter", system-ui, sans-serif;
  --font-logo: "Pinyon Script", cursive;
}
```

Enables: `bg-cave-black`, `text-neon-green`, `border-cave-rock`, `font-mono`, `font-display`.

---

## 10. Animation Specifications

### 10.1 Canvas Pan/Zoom

| Property | Value |
|----------|-------|
| Pan friction | 0.95 (momentum decay per frame) |
| Pan bounds | Unbounded (infinite in all directions) |
| Zoom range | 0.5x — 2.0x |
| Zoom step (scroll wheel) | 0.1 per tick |
| Pinch sensitivity | 1:1 |
| Spring config (inertia) | `{ stiffness: 200, damping: 25, mass: 1 }` |

### 10.2 Flyer Expansion

| Step | Duration | Easing | Property |
|------|----------|--------|----------|
| Darken background | 150ms | ease-out | opacity 0 → 1 on black overlay |
| Fade other flyers | 150ms | ease-out | opacity 1 → 0.1 |
| Scale + move flyer | 400ms | spring(300, 30) | scale + position to viewport center |
| Show overlay info | 200ms | ease-out | opacity 0 → 1, y: 20px → 0 |

### 10.3 Heat (Calor) Effect

| Step | Duration | Easing | Property |
|------|----------|--------|----------|
| Border glow | 300ms | ease-in-out | box-shadow neon-orange glow |
| Icon scale | 400ms | spring(400, 15) | scale 0 → 1.2 → 1.0 |
| Heat pulse | 600ms | ease-out | radial gradient expanding outward, opacity 0.5 → 0 |
| Count increment | 200ms | ease-out | number flip (translateY) |

### 10.4 Flyer Appear (on load / infinite loading)

| Step | Duration | Easing | Property |
|------|----------|--------|----------|
| Fade in | 200ms | ease-out | opacity 0 → 1 |
| Scale up | 200ms | spring(250, 20) | scale 0.8 → 1.0 |

### 10.5 Reduced Motion

When `prefers-reduced-motion: reduce`:
- All spring animations become instant (duration: 0)
- No inertia on pan release — canvas stops immediately
- Expansion: simple fade (no scale/translate)
- Heat effect: only icon appears, no glow/pulse
- No flyer rotation on canvas (set to 0deg)

---

## 11. Accessibility

### 11.1 Canvas Navigation

- `role="region"` on canvas container with `aria-label="Event flyers canvas. Use arrow keys to navigate, tab to move between flyers."`
- Each flyer: `role="button"` with `aria-label="{title} — {date} at {venue}"`
- Tab key moves focus between flyers (focus ring: neon-green glow)
- Enter key expands focused flyer
- Escape key closes expansion
- Arrow keys pan canvas when no flyer is focused

### 11.2 Color Contrast

| Text | Background | Ratio | Pass (AA) |
|------|------------|-------|-----------|
| `--cave-white` on `--cave-black` | #F5F5F5 / #050505 | 18.5:1 | Yes |
| `--cave-light` on `--cave-dark` | #E0E0E0 / #0A0A0A | 16.2:1 | Yes |
| `--cave-fog` on `--cave-black` | #8A8A8A / #050505 | 6.8:1 | Yes |
| `--neon-green` on `--cave-black` | #39FF14 / #050505 | 14.1:1 | Yes |
| `--neon-orange` on `--cave-black` | #FF6B2B / #050505 | 7.2:1 | Yes |
| `--neon-pink` on `--cave-black` | #FF2D7B / #050505 | 5.8:1 | Yes |

### 11.3 Touch Targets

- Minimum 44x44px for all interactive elements (WCAG 2.5.5)
- Flyer cards on canvas: always larger than 44x44px even at minimum zoom (140px at 0.5x = 70px)
- Visual feedback on every interaction (press states, focus rings)

### 11.4 Screen Reader

- Canvas announces: "Event flyers canvas. {X} events loaded. Use tab to navigate between flyers."
- Each flyer announces full event info on focus
- Heat button: "Give calor to {event}. Current count: {X}"
- Floating header: landmark `role="banner"`

---

## 12. Performance Considerations

### 12.1 Canvas Performance

- **Virtualization**: Only render flyers visible in the viewport + 1.5x buffer. Flyers outside are unmounted from the DOM.
- **Image lazy loading**: Flyers load images only when within 2x viewport bounds.
- **Transform compositing**: Use `will-change: transform` on the canvas layer. All pan/zoom uses CSS transforms (GPU-accelerated).
- **Debounce loading**: Debounce `loadMore` calls during rapid panning (300ms).
- **Throttle virtualization**: Recalculate visible flyers at most once per frame (16ms).

### 12.2 Bundle Size

- `@use-gesture/react`: ~15KB gzipped (tree-shakeable)
- `framer-motion` (already included): no additional cost
- Grain overlay: pure CSS, zero JS
- Net new JS: ~15KB gzipped

### 12.3 Image Optimization

- Use `next/image` with `sizes` appropriate for canvas card size (not full viewport)
- Canvas cards: `sizes="180px"` (desktop), `sizes="140px"` (mobile)
- Expanded view: `sizes="85vw"`
- WebP format via Supabase transforms or Next.js image optimization
- Flyer images stored in Supabase Storage `flyers` bucket

---

## 13. File-by-File Change List

### New Files to Create

| File | Purpose |
|------|---------|
| `src/features/feed/components/infinite-canvas.tsx` | Main infinite canvas — the core experience |
| `src/features/feed/components/canvas-viewport.tsx` | Pan/zoom viewport container (CSS transforms) |
| `src/features/feed/components/canvas-flyer.tsx` | Individual flyer positioned on canvas |
| `src/features/feed/components/flyer-expansion-overlay.tsx` | Expanded flyer detail overlay |
| `src/features/feed/components/heat-button.tsx` | Calor/heat toggle button |
| `src/features/feed/hooks/use-canvas.ts` | Canvas state (position, scale, focus, virtualization) |
| `src/features/feed/hooks/use-heat.ts` | Heat toggle + count hook |
| `src/features/feed/services/heat.service.ts` | Heat API calls |
| `src/features/feed/services/canvas.service.ts` | Load flyers with positions from Supabase |
| `src/shared/components/layout/floating-header.tsx` | Translucent floating header with logo |
| `src/shared/components/layout/grain-overlay.tsx` | Full-viewport noise texture |
| `src/app/api/events/[id]/heat/route.ts` | Heat toggle API endpoint |
| `supabase/migrations/XXXXXX_add_canvas_positions.sql` | Canvas x, y, rotation columns on events |
| `supabase/migrations/XXXXXX_add_heat_system.sql` | Heat table + events column |
| `supabase/migrations/XXXXXX_add_expires_at.sql` | Expiration column |
| `supabase/functions/cleanup-expired/index.ts` | Edge Function for cleanup cron |

### Files to Modify

| File | Changes |
|------|---------|
| `src/app/layout.tsx` | Replace Space_Grotesk with Space_Mono, update bg color, add GrainOverlay |
| `src/app/globals.css` | Complete palette overhaul, add @theme, grain styles, animation keyframes |
| `src/app/(main)/page.tsx` | Replace feed with InfiniteCanvas, remove bottom nav, add FloatingHeader |
| `src/features/feed/types/feed.types.ts` | Add canvas_x, canvas_y, canvas_rotation, heat_count, expires_at |
| `src/shared/components/ui/button.tsx` | Add neon variants, update colors |
| `src/shared/components/ui/input.tsx` | Dark bg, neon-green focus ring |
| `src/shared/components/ui/card.tsx` | Cave palette, no shadow, border only |
| `src/shared/components/ui/loading-spinner.tsx` | Neon-green color, glow |
| `src/features/auth/components/login-form.tsx` | Visual restyle (punk cave) |
| `src/features/auth/components/signup-form.tsx` | Visual restyle (punk cave) |
| `src/app/auth/login/page.tsx` | Visual restyle |
| `src/app/auth/signup/page.tsx` | Visual restyle |
| `src/features/events/components/event-detail.tsx` | Restyle + add heat display |
| `src/features/events/components/upload-form.tsx` | Visual restyle, add expiration field |
| `package.json` | Add `@use-gesture/react` dependency |

### Files to Delete (after migration)

| File | Reason |
|------|--------|
| `src/features/feed/components/swipe-container.tsx` | Replaced by InfiniteCanvas |
| `src/features/feed/components/flyer-card.tsx` | Replaced by CanvasFlyer |
| `src/features/feed/components/flyer-feed.tsx` | Replaced by InfiniteCanvas |
| `src/shared/components/layout/bottom-nav.tsx` | No bottom nav in V2 — canvas is full viewport |

### Files to Keep Unchanged

| File | Reason |
|------|--------|
| `src/app/api/events/route.ts` | API logic stays the same |
| `src/app/api/events/[id]/route.ts` | API logic stays the same |
| `src/app/api/events/[id]/view/route.ts` | API logic stays the same |
| `src/app/api/upload/route.ts` | API logic stays the same |
| `src/app/api/geocode/route.ts` | API logic stays the same |
| `src/app/auth/callback/route.ts` | Auth callback logic unchanged |
| `src/shared/lib/supabase/*` | Supabase client setup unchanged |
| `src/shared/lib/utils/*` | Utility functions unchanged |
| `src/features/auth/hooks/*` | Auth hooks unchanged |
| `src/features/auth/services/*` | Auth services unchanged |
| `src/features/events/hooks/*` | Event hooks unchanged |
| `src/features/events/services/*` | Event services unchanged |
| `src/features/profile/**/*` | Profile feature unchanged |
| `src/middleware.ts` | Auth middleware unchanged |
| `src/shared/types/database.types.ts` | Regenerated after migrations |
| All existing Supabase migrations | Never modify existing migrations |

---

## 14. Implementation Phases

### Phase 1 — Foundation (Visual Identity)
**Estimated effort: 2-3 days**

1. Update `globals.css` with new palette and `@theme` configuration
2. Replace `Space_Grotesk` with `Space_Mono` in root layout
3. Create `GrainOverlay` component and add to root layout
4. Create `FloatingHeader` component
5. Update all shared UI components (button, input, card, spinner) with new styles
6. Remove bottom nav from layout
7. Verify: all existing pages render with new palette (no red accents remaining)

### Phase 2 — Infinite Canvas Core
**Estimated effort: 5-6 days**

1. Install `@use-gesture/react`
2. Create canvas position migration and deploy
3. Create `use-canvas` hook (pan, zoom, focus state, virtualization)
4. Create `CanvasViewport` (gesture handling, CSS transforms)
5. Create `CanvasFlyer` (positioned flyer with rotation and shadow)
6. Create `InfiniteCanvas` (orchestrator: loads flyers, renders viewport + flyers)
7. Create `FlyerExpansionOverlay` (expanded flyer detail panel)
8. Create `canvas.service.ts` (load flyers with positions from Supabase)
9. Wire up `InfiniteCanvas` to main page as the single-screen experience
10. Implement virtualization for off-screen flyers
11. Implement infinite loading as user pans to edges
12. Write tests for canvas state management and virtualization logic

### Phase 3 — Heat System
**Estimated effort: 2-3 days**

1. Create heat migration and deploy
2. Create heat API route
3. Create `use-heat` hook and `heat.service.ts`
4. Create `HeatButton` component with animations
5. Integrate heat into `CanvasFlyer` (badge) and expansion overlay
6. Integrate heat into event detail page
7. Write tests for heat service and hook

### Phase 4 — Polish & Restyle
**Estimated effort: 2-3 days**

1. Visual restyle of all auth pages
2. Visual restyle of event detail page
3. Visual restyle of upload form (add expiration field)
4. Create `expires_at` migration
5. Create Supabase Edge Function for cleanup cron
6. Delete deprecated V1 components (swipe-container, flyer-card, flyer-feed, bottom-nav)

### Phase 5 — Accessibility & Testing
**Estimated effort: 2-3 days**

1. Add all ARIA attributes to canvas components
2. Implement keyboard navigation for canvas
3. Add reduced motion support
4. Update E2E tests for canvas interaction
5. Test on real devices (iOS Safari, Android Chrome)
6. Performance profiling (canvas with 100+ flyers)
7. Lighthouse audit

**Total estimated effort: 13-18 days**

---

## 15. Open Questions

| Question | Options | Recommendation |
|----------|---------|----------------|
| Canvas rendering: DOM transforms vs canvas engine? | HTML/CSS transforms / WebGL / actual `<canvas>` | DOM with CSS transforms — simpler, SSR-compatible, accessible, sufficient for flyer count |
| Flyer positions: server-assigned or client-computed? | Server assigns on upload / Client computes from seed | Server assigns and persists — all users see the same layout |
| Heat: allow anonymous heat? | Yes (session-based) / No (auth only) | Allow anonymous with session ID — lower friction |
| Cleanup: hard delete or soft delete? | `DELETE` / `SET status = 'expired'` | Soft delete — preserves data for analytics |
| Initial canvas view: center on nearest flyers or show all? | Center on user location / Show cluster center | Center on cluster center at default zoom — simple, no geo needed for first load |
| Neon accent: single color or user-selectable? | Fixed green / User picks | Fixed neon-green for V2, user theming is V3 territory |

---

## 16. Migration Path

### From V1 to V2

1. V2 is a **visual/UX overhaul only** — no backend breaking changes
2. New migrations are **additive** (new columns, new tables) — no drops or renames
3. The transition can be done incrementally:
   - Phase 1 (palette + header) can ship independently
   - Phase 2 (InfiniteCanvas) replaces the feed in one commit
   - Phases 3-4 are additive features
4. Feature flags not needed — this is a full redesign
5. Old components (swipe-container, flyer-card, flyer-feed, bottom-nav) are deleted after InfiniteCanvas is stable

---

*This spec is the blueprint. No code is written until each phase begins. When implementing, follow the project's CLAUDE.md conventions: TDD, screaming architecture, feature isolation, conventional commits.*
