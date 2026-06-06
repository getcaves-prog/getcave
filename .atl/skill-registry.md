# Skill Registry — getcave

## Project Context

- **Stack**: Next.js 16 + React 19 + TypeScript (strict) + Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL + PostGIS + Auth + Storage)
- **Animations**: Framer Motion + @use-gesture/react
- **Maps**: Mapbox GL JS
- **Mobile**: Capacitor (iOS + Android)
- **Deploy**: Vercel
- **Architecture**: Screaming/Feature-based (src/features/)

## User Skills

| Trigger Context | Skill |
|----------------|-------|
| Supabase: DB, Auth, Storage, migrations, RLS, Edge Functions | `supabase`, `supabase-cli` |
| E2E testing, visual verification, browser automation | `playwright-cli` |
| UI design generation, screen prototyping | `stitch-mcp` |
| Mapbox GL JS integration patterns | `mapbox-web-integration-patterns` |
| Postgres performance, indexing, RLS | `supabase-postgres-best-practices` |

## Project Conventions (from CLAUDE.md)

- Feature isolation: features NEVER import from other features
- Server Components by default; `"use client"` only when needed
- No barrel exports (import directly from file)
- Generated types from `database.types.ts` — regenerate after schema changes
- TDD mandatory: write failing tests first (red → green → refactor)
- Mobile-first: 375px primary viewport, 44×44px min touch targets
- Dark theme only, Tailwind utility classes in JSX

## Compact Rules

### supabase / supabase-cli
- Always use `createServerClient` (not `createClient`) for server components
- Use generated types from `src/shared/types/database.types.ts`
- Regenerate with `pnpm db:types` after schema changes
- RLS must be enabled on all tables — no exceptions
- Migrations via `pnpm db:migration:new <name>` then edit SQL

### playwright-cli
- Primary viewport: mobile 375px
- Use snapshots + element refs, not raw DOM dumps
- Run with `pnpm test:e2e`

### Testing (Vitest)
- Unit tests colocated: `foo.service.test.ts` next to `foo.service.ts`
- Mock Supabase client in unit tests
- Run: `pnpm test`; coverage: `pnpm test:coverage`

### Architecture
- Path alias `@/*` → `src/*`
- Features: `src/features/{feature}/{components,hooks,services,types}/`
- Shared: `src/shared/{components/ui,lib/supabase,lib/utils,hooks,types}/`
