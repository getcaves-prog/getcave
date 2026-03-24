# CavesApp — Project Conventions

## Tech Stack

| Layer         | Technology                    |
| ------------- | ----------------------------- |
| Framework     | Next.js 15 (App Router)      |
| Language      | TypeScript (strict mode)      |
| Styling       | Tailwind CSS 4               |
| Database      | Supabase (PostgreSQL + PostGIS) |
| Auth          | Supabase Auth                |
| Storage       | Supabase Storage             |
| Animations    | Framer Motion                |
| Maps          | Mapbox GL JS                 |
| Unit Tests    | Vitest                       |
| E2E Tests     | Playwright                   |
| Deploy        | Vercel                       |

## Architecture

### Screaming Architecture (Feature-Based)

The `src/features/` directory is the core of the app. Each feature is self-contained:

```
src/features/{feature}/
  components/     # UI components for this feature
  hooks/          # Custom hooks for this feature
  services/       # Data fetching / business logic
  types/          # TypeScript types for this feature
```

**Features**: `feed`, `events`, `search`, `auth`, `profile`

### Shared Code

```
src/shared/
  components/ui/    # Reusable base components (Button, Input, Card)
  components/layout/# Layout components (MobileLayout, BottomNav)
  lib/supabase/     # Supabase client setup (client, server, middleware)
  lib/utils/        # Pure utility functions
  hooks/            # Shared custom hooks
  types/            # Shared types (database.types.ts, common.types.ts)
```

### Rules

1. **Feature isolation**: Features NEVER import from other features directly. Use shared code or lift to shared.
2. **Server Components by default**: Only use `"use client"` when the component needs interactivity, browser APIs, or hooks.
3. **Colocation**: Tests, types, and services live next to the code they serve.
4. **No barrel exports**: Import directly from the file, not from `index.ts`.
5. **Supabase types**: Always use generated types from `database.types.ts`. Regenerate after schema changes.

## Code Standards

### Language

- All code, comments, variable names, and documentation in **English**
- User-facing copy can be in Spanish (Mexico market) — extract to constants/i18n files

### TypeScript

- `strict: true` in tsconfig
- No `any` — use `unknown` + type guards when type is truly unknown
- Prefer `interface` for object shapes, `type` for unions/intersections
- Zod for runtime validation (form inputs, API payloads)

### Naming Conventions

| Element         | Convention       | Example                    |
| --------------- | ---------------- | -------------------------- |
| Files           | kebab-case       | `flyer-card.tsx`           |
| Components      | PascalCase       | `FlyerCard`                |
| Hooks           | camelCase        | `useFeed`                  |
| Services        | camelCase        | `feedService`              |
| Types/Interfaces| PascalCase       | `EventDetail`              |
| Constants       | SCREAMING_SNAKE  | `DEFAULT_RADIUS`           |
| CSS classes     | Tailwind utility  | Direct in JSX              |

### Commits

Conventional Commits format:

```
feat(feed): add swipe navigation between flyers
fix(auth): handle expired session redirect
chore(deps): update supabase to 2.x
```

Types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `test`, `perf`

### Imports Order

1. React / Next.js
2. Third-party libraries
3. Shared code (`@/shared/...`)
4. Feature code (`@/features/...`)
5. Relative imports
6. Types (with `type` keyword)

## Testing

### TDD — Mandatory

Write failing tests first (red), then implement (green), then refactor. No exceptions.

### Unit Tests (Vitest)

- Test services, hooks, and utility functions
- Co-locate test files: `feed.service.test.ts` next to `feed.service.ts`
- Mock Supabase client in tests

### E2E Tests (Playwright)

- Test critical user flows: view feed, open event, upload flyer, login/signup
- Test on mobile viewport (375px) as primary

### Coverage Targets

| Type   | Target |
| ------ | ------ |
| Unit   | > 80%  |
| E2E    | Critical paths covered |

## Mobile-First Design Rules

1. **Design for 375px first**, then scale up
2. **Touch targets**: Minimum 44x44px for all interactive elements
3. **Bottom navigation**: Primary nav at the bottom, reachable by thumb
4. **No hover-only interactions**: Everything must work with tap
5. **Performance budget**: < 3s LCP on 3G, < 100KB JS per route
6. **Images**: Always use `next/image` with responsive sizes, WebP format preferred
7. **Dark theme**: Primary theme. Light mode is a future consideration.

## Environment

### Path Aliases

```json
{
  "@/*": ["./src/*"]
}
```

### Branch Strategy

- `main` — production (auto-deploys to Vercel)
- `develop` — staging
- `feat/*` — feature branches
- `fix/*` — bug fix branches

### PR Rules

- All PRs require passing CI (lint + type-check + tests)
- Squash merge to `develop`, merge commit to `main`
