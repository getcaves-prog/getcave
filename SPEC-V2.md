# CavesApp V2 — "Punk Cave" Redesign Specification

> **Caves** — Enter the underground.

---

## 1. Executive Summary

CavesApp V2 is a complete visual and UX overhaul of the existing CavesApp MVP. The backend (Supabase, PostGIS, Auth, Storage, RLS, API routes) remains untouched. The frontend transforms from a TikTok-style vertical swipe feed into an **Infinite Canvas Board** (FlyerBoard) with a dark, textured "Punk Cave" visual identity.

### What Changes

| Area | V1 (Current) | V2 (Punk Cave) |
|------|-------------|----------------|
| **Feed UX** | Vertical swipe (TikTok-style) | Infinite canvas with pan/zoom/parallax |
| **Visual Identity** | Clean dark (#0A0A0A), red accent | Deep black (#050505), grain texture, neon-punk accents |
| **Typography** | Inter + Space Grotesk | Monospace/terminal display font + body font |
| **Interaction** | Swipe up/down, tap to detail | Pan, zoom, parallax tilt, double-tap "calor" |
| **City Navigation** | Search bar with autocomplete | City Teleporter (quick switch) |
| **Social** | View count only | Heat system (calor/likes) with visual effects |
| **Desktop** | Grid fallback | Full parallax canvas with mouse-driven tilt |

### What Stays (Untouched)

- Supabase backend: tables, migrations, RLS policies, storage buckets
- Auth system: login, signup, OAuth, session management, middleware
- API routes: `/api/events`, `/api/events/[id]`, `/api/events/[id]/view`, `/api/upload`, `/api/geocode`
- Event detail page: SSR + OG meta for social sharing
- Upload functionality: image compression, form, geocoding
- Profile page: user data, avatar, events list
- Logo: kept as-is (Pinyon Script "Caves")
- Database schema: `profiles`, `categories`, `events` tables

---

## 2. Visual Identity — "Punk Cave"

### 2.1 Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--cave-black` | `#050505` | Primary background — the void |
| `--cave-dark` | `#0A0A0A` | Elevated surfaces, cards |
| `--cave-stone` | `#141414` | Secondary surfaces, nav bg |
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

### 2.5 Iconography

- Style: Outlined stroke icons (consistent with current SVG icons)
- Weight: 1.5px stroke
- Default color: `--cave-fog`
- Active color: `--neon-green`

---

## 3. Core UX Change: FlyerBoard (Infinite Canvas)

### 3.1 Concept

The FlyerBoard replaces the vertical swipe feed with a 2D canvas where event flyers float in a dark space. Users explore events by panning and zooming, like navigating a wall of posters in an underground venue.

### 3.2 Layout Algorithm

Flyers are positioned in an **organic grid** — a grid with intentional randomness:

```
Algorithm: Modified grid placement
1. Define a base grid (3 columns mobile, 4-5 columns desktop)
2. Each flyer gets a grid cell, then apply random offset:
   - X offset: random(-20px, +20px)
   - Y offset: random(-15px, +15px)
   - Rotation: random(-3deg, +3deg)
3. Result: organized enough to find things, messy enough to feel organic
4. Flyers sorted by proximity first, then event date (soonest)
5. Grid expands infinitely — load more flyers as user pans to edges
```

**Flyer card size on canvas**:
- Mobile: ~140px x 200px (portrait ratio)
- Desktop: ~180px x 260px (portrait ratio)
- Expanded/focused: scales to ~80% viewport height with animation

### 3.3 Desktop Behavior

| Feature | Behavior |
|---------|----------|
| **Navigation** | Mouse drag to pan canvas. Scroll wheel to zoom in/out. |
| **Parallax tilt** | On hover, flyer tilts toward mouse position (max 8deg). Uses CSS `perspective` + `rotateX/Y`. |
| **Hover preview** | Flyer scales up 1.05x on hover, shows event title + date overlay. |
| **Click** | Opens fullscreen expansion (see 3.5). |
| **Double-click** | Give "calor" (heat) — see section 4.2. |
| **Keyboard** | Arrow keys pan canvas. +/- zoom. Enter on focused flyer opens detail. |

### 3.4 Mobile Behavior

| Feature | Behavior |
|---------|----------|
| **Navigation** | Touch drag to pan. Pinch to zoom in/out. |
| **Parallax** | Disabled (no hover on touch). |
| **Tap** | Opens fullscreen expansion (see 3.5). |
| **Double-tap** | Give "calor" (heat). |
| **Momentum** | Pan has inertia/momentum scrolling (spring physics). |
| **Snap** | On zoom-out past minimum, snap back with spring animation. |
| **Min zoom** | 0.5x (see all flyers as thumbnails). |
| **Max zoom** | 2.0x (see flyer details clearly). |

### 3.5 Flyer Expansion (Fullscreen Zoom)

When a user taps/clicks a flyer on the canvas:

```
Animation sequence (duration: ~400ms total):
1. All other flyers fade to 0.1 opacity (150ms ease-out)
2. Background darkens to pure black (150ms)
3. Selected flyer scales from canvas position to center-screen
   - Scale: from canvas size to ~85vh height (maintain aspect ratio)
   - Position: animates from grid position to viewport center
   - Uses layoutId animation (Framer Motion shared layout)
4. Overlay appears below flyer:
   - Event title (Space Mono, neon-green)
   - Date + time
   - Venue name + distance
   - "Ver detalles" button → navigates to /event/[id]
   - "Calor" button with heat count
5. Tap outside or swipe down dismisses (reverse animation)
```

### 3.6 Canvas State Management

```
Canvas state (React state or Zustand if complexity grows):
- position: { x: number, y: number } — canvas offset
- scale: number — zoom level (0.5 - 2.0)
- focusedFlyer: string | null — ID of expanded flyer
- cityId: string — current city filter
- events: FeedEvent[] — loaded events
- loading: boolean
- hasMore: boolean
```

### 3.7 Infinite Loading

- Load initial batch of ~20 flyers for current city/location
- When user pans near the edge of loaded content, trigger `loadMore`
- New flyers appear with a fade-in + slight scale-up animation (200ms)
- Loading indicator: subtle pulsing dots at the edge of the canvas

---

## 4. New Components

### 4.1 FlyerBoard

**Location**: `src/features/feed/components/flyer-board.tsx`

**Purpose**: The main infinite canvas that replaces `SwipeContainer` and `FlyerFeed`.

**Dependencies**:
- `framer-motion` (already installed) — layout animations, spring physics, AnimatePresence
- `@use-gesture/react` (NEW) — drag, pinch, wheel gesture handling

**Props**:
```typescript
interface FlyerBoardProps {
  events: FeedEvent[];
  loading: boolean;
  onLoadMore: () => void;
  hasMore: boolean;
}
```

**Sub-components**:
- `FlyerBoardCanvas` — the pannable/zoomable container
- `FlyerBoardItem` — individual flyer on the canvas (with tilt, expansion)
- `FlyerBoardOverlay` — the expanded flyer detail overlay

**Accessibility**:
- Canvas is a `role="grid"` with `aria-label="Event flyers board"`
- Each flyer is `role="gridcell"` with proper `aria-label`
- Keyboard navigation: Tab through flyers, Enter to expand, Escape to close
- Reduced motion: disable parallax, use fade instead of scale animations

### 4.2 Heat System (Calor)

**Location**: `src/features/feed/components/heat-button.tsx`

**Purpose**: Double-tap/double-click "like" system. Users give "calor" (heat) to a flyer.

**Database change** (NEW migration):
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

**Visual effect on double-tap**:
```
Heat animation sequence:
1. Flyer border briefly glows neon-orange (300ms)
2. A flame/fire emoji or SVG icon scales up from center (0 → 1.2 → 1.0)
3. Heat count increments with a number flip animation
4. Subtle orange pulse radiates outward from flyer (like heat waves)
5. If un-heating: reverse with cool-down effect (glow fades to gray)
```

**Display**: Heat count shown as a small badge on the flyer corner: `flame-icon + count` in neon-orange.

### 4.3 City Teleporter

**Location**: `src/features/feed/components/city-teleporter.tsx`

**Purpose**: Quick city switch. Replaces the search bar for city navigation.

**UI**:
```
Desktop: Fixed top-left, shows current city name in Space Mono
  - Click opens a dropdown of available cities
  - Typing filters the list
  - Selecting a city "teleports" the board (fade-out all flyers, reload for new city, fade-in)

Mobile: Fixed top-center, compact pill showing city name
  - Tap opens a bottom sheet with city list
  - Same teleport animation on selection
```

**Teleport animation**:
```
1. All flyers simultaneously shrink to 0 + fade out (200ms, staggered 20ms each)
2. Brief "void" moment — pure black with grain texture (300ms)
3. New city flyers appear: scale from 0 → 1 with spring physics (staggered 30ms each)
4. Canvas resets to default position and zoom
```

**Data**: Cities come from distinct `city` values on existing events, or a predefined list. No new table needed — query `SELECT DISTINCT city FROM events WHERE status = 'active'` or use a hardcoded seed for MVP (Monterrey, CDMX, Guadalajara, etc.).

### 4.4 Grain Overlay

**Location**: `src/shared/components/layout/grain-overlay.tsx`

**Purpose**: Full-viewport noise texture overlay.

**Implementation**: Server component (no JS needed). Pure CSS with SVG filter.

```css
/* Grain overlay specification */
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

**Alternative**: CSS `filter: url(#noise)` with an inline SVG containing `<feTurbulence>`. Both approaches are valid — the SVG data URI is more portable.

### 4.5 Flyer Card (Canvas Version)

**Location**: `src/features/feed/components/canvas-flyer-card.tsx`

**Purpose**: Replaces the full-screen `FlyerCard`. This version is sized for the canvas grid.

**Visual**:
```
- Flyer image fills the card (object-cover)
- Subtle dark gradient at bottom (30% height)
- Bottom overlay: event title (truncated, 1 line), date (short format)
- Top-right corner: heat count badge (flame + number)
- Border: 1px solid --cave-rock, rounded-lg
- On hover (desktop):
  - Scale 1.05x
  - Border transitions to --neon-green at 0.3 opacity
  - Parallax tilt based on mouse position within card
- Random slight rotation (-3deg to +3deg) applied via inline style
```

---

## 5. Modified Existing Components

### 5.1 Root Layout (`src/app/layout.tsx`)

**Changes**:
- Replace `Space_Grotesk` with `Space_Mono` import from `next/font/google`
- Update body background from `#0A0A0A` to `#050505`
- Add `GrainOverlay` component inside body
- Update CSS variables in `globals.css` to new palette
- Keep `Inter` for body text
- Keep `Pinyon Script` for logo

### 5.2 Global CSS (`src/app/globals.css`)

**Changes**:
- Replace all CSS custom properties with new palette (section 2.1)
- Add grain overlay styles
- Add neon glow utility classes
- Add `@font-face` fallbacks if needed
- Add animation keyframes for heat effect, teleport, flyer expansion

### 5.3 Bottom Nav (`src/shared/components/layout/bottom-nav.tsx`)

**Changes**:
- Background: `--cave-stone` with blur
- Border-top: `--cave-rock`
- Active icon color: `--neon-green` (was `#FF4D4D`)
- Active label color: `--neon-green`
- Inactive: `--cave-fog`
- Add grain texture to nav background (very subtle)

### 5.4 Feed Header (`src/features/feed/components/feed-header.tsx`)

**Changes**:
- Background: `--cave-stone` with blur
- Replace "Upload" shortcut icon with City Teleporter component
- Keep hamburger menu and logo
- Menu items: neon-green active state
- Add subtle bottom border glow on scroll

### 5.5 Auth Pages (`src/app/auth/login/page.tsx`, `src/app/auth/signup/page.tsx`)

**Changes (visual only — flow stays identical)**:
- Background: `--cave-black` with grain overlay
- Form card: `--cave-dark` bg, `--cave-rock` border
- Input fields: `--cave-ash` bg, neon-green focus ring
- Submit button: neon-green bg, black text, glow on hover
- OAuth button: ghost style with neon-green border
- Logo: keep Pinyon Script, add subtle neon-green glow
- Error messages: `--neon-pink` text
- Links: `--neon-green` color

### 5.6 Event Detail (`src/app/event/[id]/page.tsx`)

**Changes**:
- Background: `--cave-black` with grain
- Metadata text: `--cave-fog` for labels, `--cave-light` for values
- Share button: ghost style with neon-green
- "Get Directions" button: neon-green solid
- Add heat count display and heat button
- Category badge: neon-green bg instead of red
- Price badge: neon-orange if paid, neon-green if free
- Keep SSR + OG meta exactly as-is

### 5.7 Upload Form (`src/features/events/components/upload-form.tsx`)

**Changes (visual only)**:
- All inputs: punk cave style (dark bg, neon focus)
- Image preview: add subtle neon-green border on uploaded image
- Submit button: neon-green
- Category select: dark dropdown with neon-green selected state

### 5.8 Profile Page

**Changes (visual only)**:
- Avatar: circular with subtle neon-green ring
- Username: Space Mono font
- Bio: Inter font, `--cave-fog` color
- Event list cards: dark bg, neon-green accent on hover
- "Edit Profile" button: ghost style
- "Sign Out" button: ghost style with `--neon-pink`

### 5.9 Shared UI Components

| Component | Changes |
|-----------|---------|
| `button.tsx` | New variants: `neon` (green bg), `ghost-neon` (green border), `danger` (pink). Remove red accent. |
| `input.tsx` | Dark bg (`--cave-ash`), green focus ring with glow, placeholder in `--cave-smoke` |
| `card.tsx` | Dark bg (`--cave-dark`), `--cave-rock` border, no shadow |
| `loading-spinner.tsx` | Neon-green color, pulsing glow effect |

---

## 6. Admin Dashboard

### 6.1 Scope

The admin dashboard keeps its existing functionality but receives the punk cave visual treatment.

**Routes** (existing or new — depends on current state):

| Route | Purpose |
|-------|---------|
| `/admin` | Dashboard overview |
| `/admin/flyers` | Flyer moderation (approve/delete) |
| `/admin/users` | User management |
| `/admin/metrics` | Analytics |

### 6.2 Metrics Display

- Active flyers count
- New users (last 7 days)
- Cities with most heat
- Top heated flyers
- Flyers expiring soon

### 6.3 Visual Style

- Same punk cave palette
- Data tables: dark bg, `--cave-rock` borders, neon-green header accents
- Action buttons: neon-green (approve), neon-pink (delete)
- Charts/graphs: neon color palette (green, orange, pink)

---

## 7. Automatic Cleanup

### 7.1 Flyer Expiration

**Default lifespan**: 7 days from creation (configurable per event via `expires_at`).

**Database change** (NEW migration):
```sql
-- Add expires_at column
ALTER TABLE events ADD COLUMN expires_at timestamptz;

-- Backfill: set expires_at to created_at + 7 days for existing events
UPDATE events SET expires_at = created_at + interval '7 days' WHERE expires_at IS NULL;

-- Make NOT NULL with default
ALTER TABLE events ALTER COLUMN expires_at SET NOT NULL;
ALTER TABLE events ALTER COLUMN expires_at SET DEFAULT (now() + interval '7 days');
```

### 7.2 Cleanup Mechanism

**Option A — Supabase Edge Function (recommended)**:
```
- Cron: runs every 24 hours (via Supabase cron extension or external cron)
- Action: UPDATE events SET status = 'expired' WHERE expires_at < NOW() AND status = 'active'
- Alternatively: DELETE if full cleanup is preferred
- Soft delete recommended (status change) for admin audit trail
```

**Option B — pg_cron** (if available):
```sql
SELECT cron.schedule('cleanup-expired-flyers', '0 4 * * *',
  $$UPDATE events SET status = 'expired' WHERE expires_at < NOW() AND status = 'active'$$
);
```

### 7.3 Upload Form Change

- Add optional "Expiration" field to upload form (default: 7 days)
- Options: 3 days, 7 days, 14 days, 30 days
- Display "Expires in X days" on event detail page

---

## 8. New Dependencies

| Package | Version | Purpose | Size Impact |
|---------|---------|---------|-------------|
| `@use-gesture/react` | `^10.3` | Pan, pinch, wheel gesture handling for canvas | ~15KB gzipped |

**Already installed** (no changes needed):
- `framer-motion` ^12.38.0 — animations, layout transitions, spring physics
- `clsx` + `tailwind-merge` — class utilities

**Removed dependencies**: None.

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

Since CavesApp uses Tailwind CSS 4, theme customization uses CSS-based configuration via `@theme` in `globals.css`:

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

This enables usage like: `bg-cave-black`, `text-neon-green`, `border-cave-rock`, `font-mono`, `font-display`.

---

## 10. Animation Specifications

### 10.1 Flyer Board Pan/Zoom

| Property | Value |
|----------|-------|
| Pan friction | 0.95 (momentum decay) |
| Pan bounds | Unbounded (infinite canvas) |
| Zoom range | 0.5x — 2.0x |
| Zoom step (scroll wheel) | 0.1 per tick |
| Pinch sensitivity | 1:1 |
| Spring config | `{ stiffness: 200, damping: 25, mass: 1 }` |

### 10.2 Flyer Expansion

| Step | Duration | Easing | Property |
|------|----------|--------|----------|
| Darken background | 150ms | ease-out | opacity 0 → 1 on black overlay |
| Fade other flyers | 150ms | ease-out | opacity 1 → 0.1 |
| Scale + move flyer | 400ms | spring(300, 30) | scale + position |
| Show overlay info | 200ms | ease-out | opacity 0 → 1, y: 20px → 0 (after flyer lands) |

### 10.3 Heat (Calor) Effect

| Step | Duration | Easing | Property |
|------|----------|--------|----------|
| Border glow | 300ms | ease-in-out | box-shadow neon-orange glow |
| Icon scale | 400ms | spring(400, 15) | scale 0 → 1.2 → 1.0 |
| Heat pulse | 600ms | ease-out | radial gradient expanding outward, opacity 0.5 → 0 |
| Count increment | 200ms | ease-out | number flip (translateY) |

### 10.4 City Teleport

| Step | Duration | Easing | Property |
|------|----------|--------|----------|
| Flyers shrink out | 200ms | ease-in | scale 1 → 0, staggered 20ms |
| Void pause | 300ms | — | empty canvas |
| Flyers appear | 300ms | spring(250, 20) | scale 0 → 1, staggered 30ms |

### 10.5 Reduced Motion

When `prefers-reduced-motion: reduce`:
- All spring animations become instant (duration: 0)
- Parallax tilt disabled
- Expansion: simple fade (no scale/translate)
- Heat effect: only icon appears, no glow/pulse
- Teleport: instant swap, no stagger

---

## 11. Accessibility

### 11.1 Canvas Navigation

- `role="grid"` on canvas container
- `role="gridcell"` on each flyer
- `aria-label` on each flyer: `"{title} — {date} at {venue}"`
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
- Flyer cards on canvas: always larger than 44x44px even at minimum zoom
- Double-tap detection: 300ms window between taps
- Visual feedback on every interaction (press states, focus rings)

### 11.4 Screen Reader

- Flyer board announces "Event board. X events loaded. Use tab to navigate."
- Each flyer announces full event info on focus
- Heat button: "Give calor to {event}. Current count: X"
- City teleporter: "Current city: Monterrey. Open city selector."

---

## 12. File-by-File Change List

### New Files to Create

| File | Purpose |
|------|---------|
| `src/features/feed/components/flyer-board.tsx` | Main infinite canvas component |
| `src/features/feed/components/flyer-board-canvas.tsx` | Pan/zoom canvas container |
| `src/features/feed/components/flyer-board-item.tsx` | Individual flyer on canvas |
| `src/features/feed/components/flyer-board-overlay.tsx` | Expanded flyer overlay |
| `src/features/feed/components/heat-button.tsx` | Calor/heat toggle button |
| `src/features/feed/components/city-teleporter.tsx` | City switch component |
| `src/features/feed/hooks/use-canvas.ts` | Canvas state (position, scale, focus) |
| `src/features/feed/hooks/use-heat.ts` | Heat toggle + count hook |
| `src/features/feed/services/heat.service.ts` | Heat API calls |
| `src/shared/components/layout/grain-overlay.tsx` | Full-viewport noise texture |
| `src/app/api/events/[id]/heat/route.ts` | Heat toggle API endpoint |
| `supabase/migrations/XXXXXX_add_heat_system.sql` | Heat table + events column |
| `supabase/migrations/XXXXXX_add_expires_at.sql` | Expiration column |
| `supabase/functions/cleanup-expired/index.ts` | Edge Function for cleanup cron |

### Files to Modify

| File | Changes |
|------|---------|
| `src/app/layout.tsx` | Replace Space_Grotesk with Space_Mono, update bg color, add GrainOverlay |
| `src/app/globals.css` | Complete palette overhaul, add @theme, grain styles, animation keyframes |
| `src/app/(main)/page.tsx` | Replace FlyerFeed with FlyerBoard |
| `src/features/feed/components/flyer-feed.tsx` | Refactor to use FlyerBoard instead of SwipeContainer |
| `src/features/feed/components/feed-header.tsx` | Visual restyle + City Teleporter integration |
| `src/features/feed/components/feed-empty.tsx` | Visual restyle (punk cave) |
| `src/features/feed/components/feed-error.tsx` | Visual restyle |
| `src/features/feed/components/geolocation-prompt.tsx` | Visual restyle |
| `src/features/feed/hooks/use-feed.ts` | Add city filter parameter |
| `src/features/feed/types/feed.types.ts` | Add heat_count, expires_at to FeedEvent |
| `src/shared/components/layout/bottom-nav.tsx` | Restyle: neon-green active, cave palette |
| `src/shared/components/layout/mobile-layout.tsx` | Add GrainOverlay if not in root |
| `src/shared/components/ui/button.tsx` | Add neon variants, update colors |
| `src/shared/components/ui/input.tsx` | Dark bg, neon-green focus ring |
| `src/shared/components/ui/card.tsx` | Cave palette, no shadow, border only |
| `src/shared/components/ui/loading-spinner.tsx` | Neon-green color, glow |
| `src/features/auth/components/login-form.tsx` | Visual restyle (punk cave) |
| `src/features/auth/components/signup-form.tsx` | Visual restyle (punk cave) |
| `src/features/auth/components/oauth-button.tsx` | Ghost neon style |
| `src/app/auth/login/page.tsx` | Visual restyle |
| `src/app/auth/signup/page.tsx` | Visual restyle |
| `src/app/auth/layout.tsx` | Add grain overlay, cave bg |
| `src/features/events/components/event-detail.tsx` | Restyle + add heat display |
| `src/features/events/components/upload-form.tsx` | Visual restyle, add expiration field |
| `src/features/events/components/event-share-button.tsx` | Neon ghost style |
| `src/features/events/components/event-metadata.tsx` | Cave palette text colors |
| `src/features/events/components/event-map.tsx` | Dark map style if using Mapbox |
| `src/features/profile/components/profile-card.tsx` | Visual restyle |
| `src/features/profile/components/profile-header.tsx` | Visual restyle, neon-green accent ring |
| `src/features/profile/components/user-events-list.tsx` | Visual restyle |
| `src/features/profile/components/user-event-card.tsx` | Visual restyle |
| `src/features/profile/components/edit-profile-form.tsx` | Visual restyle |
| `src/features/profile/components/sign-out-button.tsx` | Neon-pink ghost style |
| `src/app/not-found.tsx` | Visual restyle (cave aesthetic 404) |
| `src/app/loading.tsx` | Neon-green spinner |
| `package.json` | Add `@use-gesture/react` dependency |

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
| `src/shared/lib/utils/geo.ts` | Geo utilities unchanged |
| `src/shared/lib/utils/format.ts` | Formatters unchanged |
| `src/shared/lib/utils/cn.ts` | Class utility unchanged |
| `src/features/auth/hooks/use-auth.ts` | Auth hook unchanged |
| `src/features/auth/services/auth.service.ts` | Auth service unchanged |
| `src/features/events/hooks/*` | Event hooks unchanged |
| `src/features/events/services/*` | Event services unchanged |
| `src/features/profile/hooks/*` | Profile hooks unchanged |
| `src/features/profile/services/*` | Profile services unchanged |
| `src/middleware.ts` | Auth middleware unchanged |
| `src/shared/types/database.types.ts` | Regenerated after migrations, not manually edited |
| All existing Supabase migrations | Never modify existing migrations |
| `supabase/config.toml` | Supabase config unchanged |

### Files to Delete (after migration)

| File | Reason |
|------|--------|
| `src/features/feed/components/swipe-container.tsx` | Replaced by FlyerBoard |
| `src/features/feed/components/flyer-card.tsx` | Replaced by canvas-flyer-card / flyer-board-item |

---

## 13. Implementation Phases

### Phase 1 — Foundation (Visual Identity)
**Estimated effort: 2-3 days**

1. Update `globals.css` with new palette and `@theme` configuration
2. Replace `Space_Grotesk` with `Space_Mono` in root layout
3. Create `GrainOverlay` component and add to root layout
4. Update all shared UI components (button, input, card, spinner) with new styles
5. Update bottom nav colors
6. Verify: all existing pages render with new palette (no red accents remaining)

### Phase 2 — FlyerBoard Core
**Estimated effort: 4-5 days**

1. Install `@use-gesture/react`
2. Create `use-canvas` hook (pan, zoom, focus state)
3. Create `FlyerBoardCanvas` (gesture handling, transforms)
4. Create `FlyerBoardItem` (positioned flyer with tilt)
5. Create `FlyerBoard` (orchestrator: loads events, renders canvas + items)
6. Create `FlyerBoardOverlay` (expanded flyer detail panel)
7. Wire up `FlyerBoard` to main page, replacing `FlyerFeed`
8. Implement infinite loading on canvas edges
9. Write tests for canvas state management

### Phase 3 — Interactions & Heat
**Estimated effort: 3-4 days**

1. Create heat migration and deploy
2. Create heat API route
3. Create `use-heat` hook and `heat.service.ts`
4. Create `HeatButton` component with animations
5. Integrate heat into `FlyerBoardItem` (double-tap detection)
6. Integrate heat into event detail page
7. Update `FeedEvent` type with heat_count
8. Write tests for heat service and hook

### Phase 4 — City Teleporter & Polish
**Estimated effort: 2-3 days**

1. Create `CityTeleporter` component
2. Integrate with feed header
3. Update `use-feed` hook to accept city parameter
4. Implement teleport animation
5. Visual restyle of all auth pages
6. Visual restyle of event detail page
7. Visual restyle of upload form
8. Visual restyle of profile pages

### Phase 5 — Cleanup & Admin
**Estimated effort: 2-3 days**

1. Create `expires_at` migration
2. Update upload form with expiration selector
3. Create Supabase Edge Function for cleanup cron
4. Build or restyle admin dashboard (metrics, moderation)
5. Display expiration info on event detail page

### Phase 6 — Accessibility & Testing
**Estimated effort: 2-3 days**

1. Add all ARIA attributes to canvas components
2. Implement keyboard navigation for canvas
3. Add reduced motion support
4. Update E2E tests for new canvas interaction
5. Test on real devices (iOS Safari, Android Chrome)
6. Performance profiling (canvas with 100+ flyers)
7. Lighthouse audit

**Total estimated effort: 15-21 days**

---

## 14. Performance Considerations

### 14.1 Canvas Performance

- **Virtualization**: Only render flyers visible in the viewport + a buffer zone. Flyers outside the viewport are unmounted.
- **Image lazy loading**: Flyers load images only when within 2x viewport bounds.
- **Transform compositing**: Use `will-change: transform` on the canvas container. All pan/zoom uses CSS transforms (GPU-accelerated).
- **Debounce loading**: Debounce `loadMore` calls during rapid panning (300ms).

### 14.2 Bundle Size

- `@use-gesture/react`: ~15KB gzipped (tree-shakeable)
- `framer-motion` (already included): no additional cost
- Grain overlay: pure CSS, zero JS
- Net new JS: ~15KB gzipped

### 14.3 Image Optimization

- Use `next/image` with `sizes` appropriate for canvas card size (not full viewport)
- Canvas cards: `sizes="180px"` (desktop), `sizes="140px"` (mobile)
- Expanded view: `sizes="85vw"`
- WebP format via Supabase transforms or Next.js image optimization

---

## 15. Open Questions for Implementation

| Question | Options | Recommendation |
|----------|---------|----------------|
| Canvas library: pure gestures vs canvas engine? | `@use-gesture/react` + DOM | DOM with gestures — simpler, works with Next.js/SSR, sufficient for flyer count |
| Heat: allow anonymous heat? | Yes (session-based) / No (auth only) | Allow anonymous with session ID — lower friction for engagement |
| Cleanup: hard delete or soft delete? | `DELETE` / `SET status = 'expired'` | Soft delete — preserves data for analytics, admin can review |
| Admin dashboard: new feature or separate app? | In-app `/admin` routes / separate | In-app with role-based access — simpler for MVP |
| Neon accent: single color or user-selectable? | Fixed green / User picks | Fixed neon-green for V2, user theming is V3 territory |

---

## 16. Migration Path

### From V1 to V2

1. V2 is a **visual/UX overhaul only** — no backend breaking changes
2. New migrations are **additive** (new columns, new tables) — no drops or renames
3. The transition can be done incrementally:
   - Phase 1 (palette) can ship independently
   - Phase 2 (FlyerBoard) replaces the feed in one commit
   - Phases 3-5 are additive features
4. Feature flags not needed — this is a full redesign, not A/B testing
5. Old swipe components (`swipe-container.tsx`, `flyer-card.tsx`) are deleted after FlyerBoard is stable

---

*This spec is the blueprint. No code is written until each phase begins. When implementing, follow the project's CLAUDE.md conventions: TDD, screaming architecture, feature isolation, conventional commits.*
