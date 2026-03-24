# CavesApp — Product Specification

> **Caves** — Discover what's happening around you.

---

## 1. Product Overview

| Field             | Value                                                                 |
| ----------------- | --------------------------------------------------------------------- |
| **App Name**      | Caves                                                                 |
| **Tagline**       | Discover what's happening around you                                  |
| **Type**          | Mobile-first progressive web app                                      |
| **Domains**       | joincaves.com, getcaves.com                                           |
| **Target Market** | Mexico (initial), Latin America (expansion)                           |
| **Deploy**        | Vercel (Edge)                                                         |

### Description

Caves is a geolocation-based event flyer discovery platform. The core experience is a full-screen feed of event flyers that users swipe through — like a social map where events float around you based on your location. Users discover nearby events, explore other cities, and promote their own events by uploading flyers.

### Target Audience

| Segment        | Description                                                        |
| -------------- | ------------------------------------------------------------------ |
| **Event-goers** | 18-35 year olds looking for nightlife, concerts, food fests, art   |
| **Promoters**   | Event organizers who want local visibility without paid ads         |
| **Venues**      | Bars, clubs, galleries, restaurants hosting recurring events        |

### Core Value Proposition

- **For attendees**: One swipe to see everything happening near you tonight
- **For promoters**: Free, location-targeted visibility to nearby people
- **Zero friction**: No follows, no algorithms — just proximity and flyers

---

## 2. User Stories

### Attendee

| ID   | Story                                                                     | Priority |
| ---- | ------------------------------------------------------------------------- | -------- |
| US-1 | As a user, I want to see event flyers near me so I can find things to do  | P0       |
| US-2 | As a user, I want to swipe through events like a visual feed              | P0       |
| US-3 | As a user, I want to search events in other cities or zones               | P0       |
| US-4 | As a user, I want to tap a flyer to see full event details                | P0       |
| US-5 | As a user, I want to share an event with friends                          | P1       |
| US-6 | As a user, I want to filter events by category (music, food, art, etc.)   | P1       |
| US-7 | As a user, I want to save/bookmark events I'm interested in               | P2       |

### Promoter

| ID   | Story                                                                          | Priority |
| ---- | ------------------------------------------------------------------------------ | -------- |
| US-8 | As a promoter, I want to upload a flyer for my event                           | P0       |
| US-9 | As a promoter, I want my event visible to people near the venue                | P0       |
| US-10| As a promoter, I want to see how many views my flyer gets                      | P2       |

---

## 3. Core Features (MVP)

### 3.1 Flyer Feed

The primary screen. Full-screen flyer cards the user swipes through vertically (like TikTok/Instagram Stories).

- Full-viewport flyer image as background
- Overlay: event title, date, venue name, distance
- Swipe up/down to navigate between flyers
- Tap to open event detail
- Sorted by proximity (nearest first), then by event date (soonest first)

### 3.2 Geolocation

- Auto-detect user location via Browser Geolocation API on first visit
- Prompt for permission with clear UX explaining why
- Fallback: default to user's city (IP-based) or manual location picker
- Store user's last known location for return visits
- Configurable search radius (default: 25km)

### 3.3 Location Search

- Search bar at the top of the feed
- Autocomplete for cities, neighborhoods, venues
- When a location is selected, feed re-centers to that area
- Recent searches saved locally

### 3.4 Upload Flyer

- Protected route (requires auth)
- Form fields: flyer image, title, description, date, time, venue name, venue address (geocoded), price (optional), category, external link (optional)
- Image upload to Supabase Storage with client-side compression
- Address geocoding via a geocoding API (Mapbox or Google)
- Preview before publish

### 3.5 Event Detail

- Full flyer image (zoomable)
- Event metadata: title, description, date/time, venue, price, category
- Mini-map showing venue location
- Share button (native Web Share API, fallback to copy link)
- "Get Directions" link (opens Google Maps / Apple Maps)
- Link to promoter's profile

### 3.6 Auth

- Supabase Auth
- Providers: Email/Password + Google OAuth
- Protected routes: Upload, Profile
- Public routes: Feed, Event Detail, Search
- Session managed via Supabase middleware

---

## 4. Data Model

### 4.1 Extensions

```sql
-- Enable PostGIS for geolocation
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable pg_trgm for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### 4.2 Tables

#### `profiles`

| Column          | Type                     | Constraints                          | Description                |
| --------------- | ------------------------ | ------------------------------------ | -------------------------- |
| `id`            | `uuid`                   | PK, references `auth.users(id)`     | Supabase auth user ID      |
| `username`      | `text`                   | UNIQUE, NOT NULL                     | Display name               |
| `avatar_url`    | `text`                   | NULLABLE                             | Profile picture URL        |
| `bio`           | `text`                   | NULLABLE                             | Short bio                  |
| `role`          | `text`                   | NOT NULL, DEFAULT `'user'`           | `user` or `promoter`       |
| `city`          | `text`                   | NULLABLE                             | User's city                |
| `created_at`    | `timestamptz`            | NOT NULL, DEFAULT `now()`            | Account creation           |
| `updated_at`    | `timestamptz`            | NOT NULL, DEFAULT `now()`            | Last update                |

#### `categories`

| Column      | Type          | Constraints              | Description            |
| ----------- | ------------- | ------------------------ | ---------------------- |
| `id`        | `uuid`        | PK, DEFAULT `gen_random_uuid()` | Category ID    |
| `name`      | `text`        | UNIQUE, NOT NULL         | Category name          |
| `slug`      | `text`        | UNIQUE, NOT NULL         | URL-friendly slug      |
| `icon`      | `text`        | NULLABLE                 | Emoji or icon name     |
| `created_at`| `timestamptz` | NOT NULL, DEFAULT `now()`| Creation timestamp     |

**Seed data**: music, nightlife, sports, food, art, theater, festival, market, workshop, other

#### `events`

| Column          | Type                     | Constraints                                    | Description                        |
| --------------- | ------------------------ | ---------------------------------------------- | ---------------------------------- |
| `id`            | `uuid`                   | PK, DEFAULT `gen_random_uuid()`                | Event ID                           |
| `user_id`       | `uuid`                   | NOT NULL, FK -> `profiles(id)` ON DELETE CASCADE | Creator                          |
| `category_id`   | `uuid`                   | NOT NULL, FK -> `categories(id)`               | Event category                     |
| `title`         | `text`                   | NOT NULL                                       | Event title                        |
| `description`   | `text`                   | NULLABLE                                       | Event description                  |
| `flyer_url`     | `text`                   | NOT NULL                                       | Flyer image URL (Supabase Storage) |
| `venue_name`    | `text`                   | NOT NULL                                       | Venue display name                 |
| `venue_address` | `text`                   | NOT NULL                                       | Full address string                |
| `location`      | `geography(Point, 4326)` | NOT NULL                                       | PostGIS point (lng, lat)           |
| `date`          | `date`                   | NOT NULL                                       | Event date                         |
| `time_start`    | `time`                   | NOT NULL                                       | Start time                         |
| `time_end`      | `time`                   | NULLABLE                                       | End time                           |
| `price`         | `numeric(10,2)`          | NULLABLE                                       | Ticket price (NULL = free)         |
| `currency`      | `text`                   | NOT NULL, DEFAULT `'MXN'`                      | Currency code                      |
| `external_url`  | `text`                   | NULLABLE                                       | Ticket link or website             |
| `status`        | `text`                   | NOT NULL, DEFAULT `'active'`                   | `draft`, `active`, `cancelled`, `past` |
| `views_count`   | `integer`                | NOT NULL, DEFAULT `0`                          | View counter                       |
| `created_at`    | `timestamptz`            | NOT NULL, DEFAULT `now()`                      | Creation timestamp                 |
| `updated_at`    | `timestamptz`            | NOT NULL, DEFAULT `now()`                      | Last update                        |

### 4.3 Indexes

```sql
-- Geospatial index for proximity queries (critical for performance)
CREATE INDEX idx_events_location ON events USING GIST (location);

-- Filter by status + date (feed queries)
CREATE INDEX idx_events_status_date ON events (status, date);

-- Filter by category
CREATE INDEX idx_events_category ON events (category_id);

-- User's events
CREATE INDEX idx_events_user ON events (user_id);

-- Text search on title
CREATE INDEX idx_events_title_trgm ON events USING GIN (title gin_trgm_ops);
```

### 4.4 Key Queries

#### Nearby events (feed)

```sql
SELECT
  e.*,
  c.name AS category_name,
  c.slug AS category_slug,
  ST_Distance(e.location, ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography) AS distance_meters
FROM events e
JOIN categories c ON c.id = e.category_id
WHERE e.status = 'active'
  AND e.date >= CURRENT_DATE
  AND ST_DWithin(
    e.location,
    ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography,
    $radius_meters  -- e.g. 25000 for 25km
  )
ORDER BY distance_meters ASC, e.date ASC
LIMIT $limit
OFFSET $offset;
```

#### Events by location search

Same query as above but with `$lng` and `$lat` set to the searched location coordinates.

### 4.5 Row Level Security (RLS)

```sql
-- Profiles: users can read all, update own
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles readable" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Events: anyone reads active, creators manage own
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active events readable" ON events FOR SELECT USING (status = 'active');
CREATE POLICY "Users insert own events" ON events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own events" ON events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own events" ON events FOR DELETE USING (auth.uid() = user_id);

-- Categories: public read-only
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories readable" ON categories FOR SELECT USING (true);
```

### 4.6 Supabase Storage

| Bucket    | Public | Max Size | Allowed Types                | Description        |
| --------- | ------ | -------- | ---------------------------- | ------------------ |
| `flyers`  | Yes    | 5MB      | `image/jpeg`, `image/png`, `image/webp` | Event flyer images |
| `avatars` | Yes    | 2MB      | `image/jpeg`, `image/png`, `image/webp` | Profile pictures   |

---

## 5. Pages & Routes

| Route              | Type       | Auth     | Description                              |
| ------------------ | ---------- | -------- | ---------------------------------------- |
| `/`                | Page       | Public   | Main flyer feed (geolocation-based)      |
| `/event/[id]`      | Page       | Public   | Event detail with full info and map       |
| `/search`          | Page       | Public   | Search by location and/or category        |
| `/upload`          | Page       | Protected| Upload flyer form                         |
| `/auth/login`      | Page       | Public   | Login (email + Google)                    |
| `/auth/signup`     | Page       | Public   | Registration                              |
| `/auth/callback`   | Route      | Public   | OAuth callback handler                    |
| `/profile`         | Page       | Protected| User profile + their events               |
| `/profile/edit`    | Page       | Protected| Edit profile                              |

### API Routes (Route Handlers)

| Route                      | Method | Auth     | Description                          |
| -------------------------- | ------ | -------- | ------------------------------------ |
| `/api/events`              | GET    | Public   | Fetch nearby events (with geo params)|
| `/api/events`              | POST   | Protected| Create new event                     |
| `/api/events/[id]`         | GET    | Public   | Get single event                     |
| `/api/events/[id]`         | PATCH  | Protected| Update own event                     |
| `/api/events/[id]`         | DELETE | Protected| Delete own event                     |
| `/api/events/[id]/view`    | POST   | Public   | Increment view count                 |
| `/api/upload`              | POST   | Protected| Upload flyer image to storage        |
| `/api/geocode`             | GET    | Public   | Geocode an address to coordinates    |

---

## 6. Tech Architecture

### 6.1 Stack

| Layer         | Technology                         |
| ------------- | ---------------------------------- |
| Framework     | Next.js 15 (App Router)           |
| Language      | TypeScript (strict mode)           |
| Styling       | Tailwind CSS 4                     |
| Database      | Supabase PostgreSQL + PostGIS      |
| Auth          | Supabase Auth (email + Google)     |
| Storage       | Supabase Storage                   |
| Realtime      | Supabase Realtime (future: live event updates) |
| Animations    | Framer Motion                      |
| Maps          | Mapbox GL JS or Leaflet            |
| Geocoding     | Mapbox Geocoding API               |
| Deploy        | Vercel (Edge Runtime)              |
| Testing       | Vitest (unit) + Playwright (e2e)   |

### 6.2 Architecture — Screaming + Feature-Based

```
src/
  app/                          # Next.js App Router
    (auth)/                     # Auth route group
      login/page.tsx
      signup/page.tsx
      callback/route.ts
    (main)/                     # Main layout group (with bottom nav)
      page.tsx                  # Feed
      search/page.tsx
      upload/page.tsx
      profile/page.tsx
      profile/edit/page.tsx
    event/[id]/page.tsx         # Event detail (separate layout)
    api/                        # Route handlers
      events/route.ts
      events/[id]/route.ts
      events/[id]/view/route.ts
      upload/route.ts
      geocode/route.ts
    layout.tsx                  # Root layout
    globals.css
  features/                     # Feature modules (screaming architecture)
    feed/                       # Flyer feed feature
      components/
        flyer-card.tsx
        flyer-feed.tsx
        swipe-container.tsx
      hooks/
        use-feed.ts
        use-geolocation.ts
      services/
        feed.service.ts
      types/
        feed.types.ts
    events/                     # Event management feature
      components/
        event-detail.tsx
        event-map.tsx
        upload-form.tsx
      hooks/
        use-event.ts
        use-upload.ts
      services/
        events.service.ts
      types/
        event.types.ts
    search/                     # Search feature
      components/
        search-bar.tsx
        location-picker.tsx
        category-filter.tsx
      hooks/
        use-search.ts
      services/
        search.service.ts
    auth/                       # Auth feature
      components/
        login-form.tsx
        signup-form.tsx
        auth-guard.tsx
      hooks/
        use-auth.ts
      services/
        auth.service.ts
    profile/                    # Profile feature
      components/
        profile-card.tsx
        user-events-list.tsx
      hooks/
        use-profile.ts
      services/
        profile.service.ts
  shared/                       # Shared utilities
    components/
      ui/                       # Base UI components
        button.tsx
        input.tsx
        card.tsx
        bottom-nav.tsx
        loading-spinner.tsx
      layout/
        mobile-layout.tsx
    lib/
      supabase/
        client.ts               # Browser client
        server.ts               # Server client
        middleware.ts            # Auth middleware
      utils/
        geo.ts                  # Geolocation utilities
        format.ts               # Date, price formatters
        cn.ts                   # Class name utility
    hooks/
      use-media-query.ts
    types/
      database.types.ts         # Generated Supabase types
      common.types.ts
  middleware.ts                 # Next.js middleware (auth)
```

### 6.3 Rendering Strategy

| Route            | Rendering    | Reason                                    |
| ---------------- | ------------ | ----------------------------------------- |
| `/` (feed)       | Client       | Requires geolocation + swipe interaction  |
| `/event/[id]`    | Server (SSR) | SEO + social sharing (OG meta)            |
| `/search`        | Client       | Interactive search + dynamic results      |
| `/upload`        | Client       | Form with image upload                    |
| `/auth/*`        | Server       | Simple forms, SSR for speed               |
| `/profile`       | Server       | Static data fetch, hydrate for actions    |

### 6.4 Supabase Client Strategy

- **Server Components / Route Handlers**: `createServerClient` from `@supabase/ssr`
- **Client Components**: `createBrowserClient` from `@supabase/ssr`
- **Middleware**: `createServerClient` with cookie handling for session refresh

---

## 7. UI/UX Guidelines

### 7.1 Design Principles

| Principle           | Description                                                      |
| ------------------- | ---------------------------------------------------------------- |
| Flyers first        | The flyer IS the UI. Minimal chrome, maximum visual impact.      |
| Dark by default     | Dark theme fits nightlife/event vibes. Optional light mode later. |
| Thumb-friendly      | All primary actions reachable with one thumb                     |
| Fast & fluid        | Sub-200ms interactions, smooth animations, optimistic updates    |
| Location-aware      | Everything contextual to where you are                           |

### 7.2 Layout

- **Mobile base**: 375px (iPhone SE)
- **Breakpoints**: `sm: 640px`, `md: 768px`, `lg: 1024px`
- **Desktop**: Max-width container, flyers in grid layout instead of vertical swipe

### 7.3 Color Palette (Dark Theme)

| Token          | Value       | Usage                     |
| -------------- | ----------- | ------------------------- |
| `bg-primary`   | `#0A0A0A`  | Main background           |
| `bg-secondary` | `#1A1A1A`  | Card/surface background   |
| `bg-tertiary`  | `#2A2A2A`  | Input/elevated surfaces   |
| `text-primary` | `#FFFFFF`   | Primary text              |
| `text-secondary`| `#A0A0A0` | Secondary/muted text      |
| `accent`       | `#FF4D4D`  | CTA buttons, highlights   |
| `accent-alt`   | `#FFD700`  | Secondary accent          |

### 7.4 Typography

- **Font**: Inter (body) + Space Grotesk (headings)
- **Scale**: 14px base on mobile, 16px on desktop

### 7.5 Navigation

- **Mobile**: Bottom navigation bar (4 tabs: Feed, Search, Upload, Profile)
- **Desktop**: Top navigation bar
- Bottom nav auto-hides on scroll down, reappears on scroll up

### 7.6 Animations

- **Flyer swipe**: Vertical snap scroll or Framer Motion `drag` with spring physics
- **Page transitions**: Fade/slide using Next.js `loading.tsx` + Framer Motion
- **Micro-interactions**: Button press scale, heart/save animation

---

## 8. Infrastructure Setup Checklist

### Required Before Development

| Task                          | Status | Notes                                          |
| ----------------------------- | ------ | ---------------------------------------------- |
| Create Supabase project       | [ ]    | Region: us-east-1 or closest to Mexico         |
| Enable PostGIS extension      | [ ]    | Via Supabase dashboard > Extensions             |
| Enable pg_trgm extension      | [ ]    | For fuzzy text search                           |
| Create Storage buckets        | [ ]    | `flyers` (public, 5MB) + `avatars` (public, 2MB) |
| Configure Auth providers      | [ ]    | Email + Google OAuth                            |
| Create GitHub repo            | [ ]    | `cavesapp/caves-web` or similar                 |
| Create Vercel project         | [ ]    | Link to GitHub repo, set env vars              |
| Configure DNS                 | [ ]    | `joincaves.com` and `getcaves.com` -> Vercel   |
| Get Mapbox API key            | [ ]    | For geocoding + optional map tiles              |
| Run DB migrations             | [ ]    | Tables, indexes, RLS policies, seed categories  |
| Generate Supabase types       | [ ]    | `npx supabase gen types typescript`             |

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Mapbox (geocoding)
NEXT_PUBLIC_MAPBOX_TOKEN=

# App
NEXT_PUBLIC_APP_URL=https://joincaves.com
NEXT_PUBLIC_DEFAULT_RADIUS=25000
```

---

## 9. MVP Scope & Phases

### Phase 1 — Core (Weeks 1-3)

- [x] Project setup (Next.js, Supabase, Tailwind, Vercel)
- [ ] Auth (login, signup, session management)
- [ ] Database schema + migrations + seed data
- [ ] Flyer feed (geolocation + swipe + proximity query)
- [ ] Event detail page (SSR with OG meta)
- [ ] Upload flyer form (image + metadata + geocoding)

### Phase 2 — Polish (Weeks 4-5)

- [ ] Location search with autocomplete
- [ ] Category filtering
- [ ] Share functionality (Web Share API)
- [ ] Profile page (user's events)
- [ ] Image optimization (Supabase transforms or Sharp)
- [ ] Loading states, error boundaries, empty states

### Phase 3 — Growth (Weeks 6+)

- [ ] Bookmarks / saved events
- [ ] View count analytics
- [ ] Push notifications (upcoming saved events)
- [ ] PWA manifest + service worker
- [ ] Admin moderation tools
- [ ] Premium promoter features (pinned flyers, analytics)

---

## 10. Open Questions

| Question                                                    | Status  |
| ----------------------------------------------------------- | ------- |
| Should flyers auto-expire after the event date?             | Pending |
| Moderation: manual review or auto-publish?                  | Pending |
| Max events per user (free tier)?                            | Pending |
| Geocoding provider: Mapbox vs Google vs Nominatim (free)?   | Pending |
| Desktop layout: grid of cards or side-by-side feed + map?   | Pending |
| Multi-language support needed for MVP?                      | Pending |
claude plugin install figma@claude-plugins-official