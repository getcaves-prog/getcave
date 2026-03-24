---
name: supabase
description: >
  Complete Supabase CLI management for CavesApp — migrations, RLS, auth, storage, Edge Functions, PostGIS, type generation, and local dev.
  Trigger: When working with database, migrations, auth, storage, edge functions, types, or supabase CLI commands.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

## When to Use

- Initializing or linking a Supabase project
- Creating, editing, or pushing database migrations
- Setting up or modifying RLS policies
- Working with PostGIS (spatial queries, geolocation)
- Managing auth providers and settings
- Working with Supabase Storage buckets and policies
- Creating or deploying Edge Functions (Deno runtime)
- Generating TypeScript types from the database schema
- Running local Supabase for development (Docker)
- Seeding the database with test data
- Inspecting or debugging database state
- Managing environment variables for Supabase

---

## Prerequisites

### Supabase CLI Installation

```bash
# Install globally (recommended for this project)
brew install supabase/tap/supabase

# Or via npm (fallback)
npm install -g supabase

# Verify
supabase --version
```

### Required Keys

| Key | Where to Get | Purpose | Scope |
|-----|-------------|---------|-------|
| `SUPABASE_ACCESS_TOKEN` | [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) | CLI auth (`supabase login`) | Personal — authenticates CLI commands against your account |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API | Client-side Supabase URL | Public — safe to expose in browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API | Client-side anon key (respects RLS) | Public — safe to expose in browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API | Server-side admin key (bypasses RLS) | **SECRET** — server only, NEVER in client code |
| `SUPABASE_DB_URL` | Project Settings → Database → Connection string | Direct Postgres connection | **SECRET** — migrations and server only |
| `SUPABASE_PROJECT_REF` | Project Settings → General → Reference ID | Project identifier for CLI commands | Not secret but project-specific |

### .env.local Template

```env
# Public (client-safe)
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Secret (server only — NEVER prefix with NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_DB_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

---

## Project Structure

```
cavesapp/
├── supabase/
│   ├── config.toml              # Supabase project config (auto-generated)
│   ├── migrations/              # SQL migration files (version-controlled)
│   │   ├── 20260324000000_enable_postgis.sql
│   │   ├── 20260324000001_create_venues.sql
│   │   └── 20260324000002_create_events.sql
│   ├── seed.sql                 # Seed data for local dev
│   └── functions/               # Edge Functions (Deno runtime)
│       └── hello/
│           └── index.ts
├── src/
│   └── shared/
│       ├── lib/supabase/
│       │   ├── client.ts        # Browser client (createBrowserClient)
│       │   ├── server.ts        # Server client (createServerClient)
│       │   └── middleware.ts    # Auth middleware helper
│       └── types/
│           └── database.types.ts # Auto-generated from schema
```

---

## Critical Patterns

### 1. Migration Naming Convention

Format: `{YYYYMMDD}{sequence}_{description}.sql`

```
20260324000000_enable_postgis.sql
20260324000001_create_venues.sql
20260324000002_add_rls_policies_venues.sql
```

- Sequence resets each day (000000, 000001, etc.)
- Description is snake_case, describes WHAT the migration does
- ONE concern per migration (don't mix table creation with RLS)

### 2. RLS — ALWAYS ENABLED, NO EXCEPTIONS

Every table MUST have RLS enabled. Every table MUST have at least one policy.

```sql
-- ALWAYS after CREATE TABLE
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all venues (public data)
CREATE POLICY "Anyone can view venues"
  ON public.venues FOR SELECT
  USING (true);

-- Only owner can modify
CREATE POLICY "Owners can update own venues"
  ON public.venues FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);
```

**RLS Decision Tree:**

| Data Type | SELECT | INSERT | UPDATE | DELETE |
|-----------|--------|--------|--------|--------|
| Public (venues, events) | `USING (true)` | `WITH CHECK (auth.uid() = owner_id)` | `USING (auth.uid() = owner_id)` | `USING (auth.uid() = owner_id)` |
| Private (profiles) | `USING (auth.uid() = id)` | `WITH CHECK (auth.uid() = id)` | `USING (auth.uid() = id)` | Not allowed |
| Shared (event attendees) | `USING (true)` | `WITH CHECK (auth.uid() = user_id)` | `USING (auth.uid() = user_id)` | `USING (auth.uid() = user_id)` |

### 3. PostGIS — Spatial Queries

CavesApp uses PostGIS for venue/event geolocation.

```sql
-- Enable PostGIS (do this FIRST, in its own migration)
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- Use geography type for lat/lng columns
ALTER TABLE public.venues
  ADD COLUMN location geography(POINT, 4326);

-- Create spatial index (CRITICAL for performance)
CREATE INDEX idx_venues_location ON public.venues USING GIST (location);

-- Insert with PostGIS
INSERT INTO public.venues (name, location)
VALUES ('Cave Bar', ST_SetSRID(ST_MakePoint(-99.1332, 19.4326), 4326));

-- Query: venues within 5km radius
SELECT *, ST_Distance(location, ST_SetSRID(ST_MakePoint(-99.1332, 19.4326), 4326)) AS distance
FROM public.venues
WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint(-99.1332, 19.4326), 4326), 5000)
ORDER BY distance;
```

### 4. Type Generation — After EVERY Schema Change

```bash
# From remote project
supabase gen types typescript --project-id "$SUPABASE_PROJECT_REF" > src/shared/types/database.types.ts

# From local instance
supabase gen types typescript --local > src/shared/types/database.types.ts
```

**NEVER manually edit `database.types.ts`** — it's auto-generated.

### 5. Edge Functions — Deno Runtime

```bash
supabase functions new process-event
```

```typescript
// supabase/functions/process-event/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "No auth" }), { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  // Function logic here...

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

### 6. Supabase Client Setup (Next.js 15 + SSR)

**Browser client** (`src/shared/lib/supabase/client.ts`):
```typescript
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/shared/types/database.types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Server client** (`src/shared/lib/supabase/server.ts`):
```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/shared/types/database.types";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component — ignore
          }
        },
      },
    }
  );
}
```

**Middleware** (`src/middleware.ts`):
```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

---

## Commands Reference

### Project Setup

```bash
supabase init                                # Initialize supabase/ directory
supabase login                               # Auth with access token
supabase link --project-ref <ref>            # Link to remote project
supabase projects list                       # List all projects in your org
```

### Local Development (Docker Required)

```bash
supabase start                               # Start local Supabase stack
supabase stop                                # Stop local stack
supabase stop --no-backup                    # Stop and discard local data
supabase status                              # Show local URLs and keys
```

### Migrations

```bash
supabase migration new <name>                # Create empty migration file
supabase migration list                      # List migrations + status
supabase migration repair --status applied <version>  # Fix migration state
supabase db push                             # Push migrations to REMOTE
supabase db push --dry-run                   # Preview what would be pushed
supabase db reset                            # Reset LOCAL DB + replay all migrations + seed
supabase db diff --schema public             # Diff local state vs migrations
supabase db diff --schema public -f <name>   # Diff and save as new migration
supabase db dump --schema public             # Dump current remote schema
supabase db dump --data-only --schema public # Dump data only
```

### Type Generation

```bash
supabase gen types typescript --project-id <ref> > src/shared/types/database.types.ts
supabase gen types typescript --local > src/shared/types/database.types.ts
```

### Edge Functions

```bash
supabase functions new <name>                # Create new function
supabase functions serve                     # Serve all locally
supabase functions serve <name>              # Serve one locally
supabase functions deploy <name>             # Deploy one to production
supabase functions deploy                    # Deploy all
supabase functions delete <name>             # Delete from production
```

### Storage

```bash
supabase storage ls                          # List buckets
supabase storage ls s3://bucket-name         # List objects in bucket
supabase storage cp local.png s3://bucket/path  # Upload file
supabase storage rm s3://bucket/path/file    # Delete file
```

### Database Inspection

```bash
supabase inspect db table-sizes              # Table sizes
supabase inspect db index-sizes              # Index sizes
supabase inspect db unused-indexes           # Find unused indexes
supabase inspect db cache-hit                # Cache hit ratio
supabase inspect db bloat                    # Table bloat
supabase inspect db long-running-queries     # Active long queries
supabase inspect db outliers                 # Slowest queries
```

### Auth (via Dashboard or SQL)

```sql
-- Check current user in RLS context
SELECT auth.uid();
SELECT auth.jwt();

-- List auth users (admin only)
SELECT * FROM auth.users LIMIT 10;
```

---

## Local Dev Workflow

```bash
# 1. Start local stack
supabase start

# 2. Create migration
supabase migration new create_venues

# 3. Write SQL in the generated file
# supabase/migrations/20260324000000_create_venues.sql

# 4. Apply by resetting local DB
supabase db reset

# 5. Generate types
supabase gen types typescript --local > src/shared/types/database.types.ts

# 6. Develop and test locally...

# 7. When ready, push to remote
supabase db push

# 8. Regenerate types from remote (canonical)
supabase gen types typescript --project-id "$SUPABASE_PROJECT_REF" > src/shared/types/database.types.ts
```

---

## Troubleshooting

| Problem | Command | Fix |
|---------|---------|-----|
| Docker not running | `supabase start` fails | Start Docker Desktop first |
| Migration conflict | `migration list` shows diverged | `supabase migration repair --status applied <version>` |
| Types outdated | Type errors after schema change | Re-run `gen types` command |
| RLS blocking queries | Queries return empty | Check policies with `SELECT * FROM pg_policies` |
| PostGIS not available | `geography` type not found | Run `CREATE EXTENSION IF NOT EXISTS postgis` migration first |
| Edge Function 500 | Function crashes | Check logs: `supabase functions serve --debug` |
| Stale local data | Old data persists | `supabase db reset` to replay from migrations |

---

## Anti-Patterns — DO NOT

- **NEVER** expose `SUPABASE_SERVICE_ROLE_KEY` in client code or prefix with `NEXT_PUBLIC_`
- **NEVER** disable RLS "temporarily" — write proper policies instead
- **NEVER** manually edit `database.types.ts` — always regenerate
- **NEVER** use `supabase db push` without `--dry-run` first on a production project
- **NEVER** put secrets in `config.toml` — use environment variables
- **NEVER** skip spatial indexes when using PostGIS — queries will be O(n) instead of O(log n)
