---
name: vercel
description: >
  Complete Vercel CLI management for CavesApp — deployments, env vars, domains, logs, analytics, Edge Runtime, and rollbacks.
  Trigger: When deploying, managing domains, env vars, checking deployment status, or configuring Vercel project settings.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

## When to Use

- Deploying CavesApp to preview or production
- Managing environment variables across scopes (production, preview, development)
- Configuring custom domains (joincaves.com, getcaves.com)
- Checking deployment status, logs, or build output
- Rolling back a broken production deployment
- Pulling env vars for local development
- Configuring Edge Runtime or serverless function settings
- Inspecting build performance or function execution
- Setting up GitHub integration and auto-deploys

---

## Prerequisites

### Vercel CLI Installation

```bash
# Install globally (recommended)
npm install -g vercel

# Or via bun
bun install -g vercel

# Verify
vercel --version
```

### Required Keys & Tokens

| Key | Where to Get | Purpose |
|-----|-------------|---------|
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) | CLI auth (non-interactive, CI/CD) |
| `VERCEL_ORG_ID` | `.vercel/project.json` (after `vercel link`) | Organization/team identifier |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` (after `vercel link`) | Project identifier |

**Note**: For interactive use, `vercel login` is enough (browser-based OAuth). The token is only needed for CI/CD or non-interactive scripts.

---

## Project Configuration

### CavesApp Deploy Settings

| Setting | Value |
|---------|-------|
| **Framework** | Next.js |
| **Root Directory** | `.` (standalone, not monorepo) |
| **Build Command** | `next build` (default) |
| **Output Directory** | `.next` (default) |
| **Install Command** | `npm install` (or `pnpm install`) |
| **Node.js Version** | 20.x |
| **Domains** | `joincaves.com`, `getcaves.com` |
| **Edge Runtime** | Used for middleware (auth session refresh) |

### .vercel/project.json (auto-generated after `vercel link`)

```json
{
  "projectId": "prj_...",
  "orgId": "team_..."
}
```

**Add `.vercel/` to `.gitignore`** — it contains project-specific IDs.

### vercel.json (optional, project root)

```json
{
  "framework": "nextjs",
  "regions": ["iad1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ],
  "crons": []
}
```

**Region selection**: `iad1` (US East) is closest to Mexico for lowest latency. Alternatives: `gru1` (Sao Paulo) for South America expansion.

---

## Critical Patterns

### 1. Environment Variable Scopes

| Scope | When Used | Example |
|-------|-----------|---------|
| **Production** | Live site (`joincaves.com`) | Real Supabase keys, real Mapbox token |
| **Preview** | PR/branch deploys (`*.vercel.app`) | Staging Supabase project or same as prod |
| **Development** | Local dev (`vercel env pull`) | Same as preview or local Supabase |

**Rules:**
- `NEXT_PUBLIC_*` vars are exposed to the browser — only use for truly public values
- `SUPABASE_SERVICE_ROLE_KEY` goes to **Production + Preview** only, NEVER development (use local Supabase)
- Always set vars in ALL relevant scopes, not just production

### 2. Environment Variables for CavesApp

```bash
# Supabase (required)
vercel env add NEXT_PUBLIC_SUPABASE_URL          # All scopes
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY     # All scopes
vercel env add SUPABASE_SERVICE_ROLE_KEY         # Production + Preview only

# Mapbox (required for geocoding)
vercel env add NEXT_PUBLIC_MAPBOX_TOKEN           # All scopes

# App config
vercel env add NEXT_PUBLIC_APP_URL                # Production: https://joincaves.com
vercel env add NEXT_PUBLIC_DEFAULT_RADIUS         # All scopes: 25000
```

### 3. Deployment Strategy

```
main branch    → Auto-deploy to PRODUCTION (joincaves.com)
develop branch → Auto-deploy to PREVIEW (staging URL)
feat/* branch  → Auto-deploy to PREVIEW (unique URL per push)
fix/* branch   → Auto-deploy to PREVIEW (unique URL per push)
```

**GitHub Integration**: Vercel auto-deploys on push when connected. No manual `vercel --prod` needed for main branch.

### 4. Edge Runtime (Middleware)

CavesApp middleware runs on Edge for auth session refresh:

```typescript
// src/middleware.ts
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

Edge Runtime limitations:
- No Node.js APIs (`fs`, `path`, `crypto.createHash`, etc.)
- No native modules
- Max 25MB bundle size
- 30s execution timeout (vs 60s for serverless)
- Use `export const runtime = 'edge'` in route handlers that need edge

### 5. Serverless Functions (API Routes)

```typescript
// Default: Node.js runtime (serverless)
// app/api/events/route.ts — runs as serverless function

// Opt into Edge:
export const runtime = 'edge';

// Configure timeout and memory:
export const maxDuration = 30; // seconds (Pro plan: up to 300s)
```

**Decision tree:**
| Route | Runtime | Why |
|-------|---------|-----|
| `/api/events` (GET) | Edge | Fast reads, no heavy deps |
| `/api/events` (POST) | Node.js | Image processing, Supabase admin |
| `/api/upload` | Node.js | File handling, storage upload |
| `/api/geocode` | Edge | Simple proxy to Mapbox API |
| `middleware.ts` | Edge | Always Edge (Next.js requirement) |

### 6. Custom Domains

```bash
# Add primary domain
vercel domains add joincaves.com

# Add secondary domain (redirects to primary)
vercel domains add getcaves.com

# Verify DNS is configured
vercel domains inspect joincaves.com
```

**DNS Setup** (at domain registrar):

| Type | Name | Value |
|------|------|-------|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

### 7. Preview Deployments & PR Comments

Vercel automatically:
- Creates a unique URL for every push to non-production branches
- Posts a comment on GitHub PRs with the preview URL
- Runs checks (build success/failure)

Use preview URLs to test before merging to `main`.

---

## Commands Reference

### Authentication

```bash
vercel login                                 # Login via browser (interactive)
vercel login --token $VERCEL_TOKEN           # Login with token (CI/CD)
vercel whoami                                # Check current user/team
vercel switch                                # Switch between teams
```

### Project Setup

```bash
vercel link                                  # Link current dir to Vercel project
vercel project ls                            # List all projects
vercel project inspect                       # Show project details
```

### Deployments

```bash
vercel                                       # Deploy to preview
vercel --prod                                # Deploy to production
vercel deploy --prebuilt                     # Deploy pre-built .vercel/output
vercel deploy --force                        # Force rebuild (no cache)
vercel deploy --no-wait                      # Don't wait for build to finish

# Deployment inspection
vercel ls                                    # List recent deployments
vercel ls --limit 10                         # List more
vercel inspect <deployment-url>              # Full deployment details
vercel logs <deployment-url>                 # Build + function logs
vercel logs <deployment-url> --follow        # Stream logs in real-time

# Rollback
vercel rollback                              # Rollback production to previous
vercel rollback <deployment-url>             # Rollback to specific deployment

# Promote
vercel promote <deployment-url>              # Promote preview to production

# Cancel
vercel cancel <deployment-id>               # Cancel in-progress deployment

# Redeploy
vercel redeploy <deployment-url>             # Rebuild same commit
```

### Environment Variables

```bash
# Add (interactive — prompts for value and scope)
vercel env add <name>

# Add non-interactive
echo "value" | vercel env add <name> production
echo "value" | vercel env add <name> preview
echo "value" | vercel env add <name> development

# List
vercel env ls                                # All env vars
vercel env ls production                     # Only production vars

# Pull to local (creates .env.local)
vercel env pull                              # Pull development scope
vercel env pull .env.local                   # Explicit output path
vercel env pull --environment=production     # Pull production vars

# Remove
vercel env rm <name>                         # Remove (interactive scope selection)
vercel env rm <name> production              # Remove from specific scope
```

### Domains

```bash
vercel domains ls                            # List all domains
vercel domains add <domain>                  # Add domain to project
vercel domains rm <domain>                   # Remove domain
vercel domains inspect <domain>              # DNS status + SSL cert info
vercel domains verify <domain>               # Force DNS verification

# Aliases (point deployment to custom URL)
vercel alias set <deployment-url> <domain>
vercel alias ls
vercel alias rm <alias>
```

### Cron Jobs

```bash
# Defined in vercel.json
# {
#   "crons": [
#     { "path": "/api/cron/expire-events", "schedule": "0 0 * * *" }
#   ]
# }

# List cron jobs
vercel crons ls
```

### Build & Cache

```bash
vercel build                                 # Build locally (creates .vercel/output)
vercel build --prod                          # Build with production env vars

# Clear remote build cache (when builds are stale)
# Done via Vercel Dashboard > Settings > Advanced > Clear Cache
# Or by deploying with --force
vercel deploy --force
```

### Secrets (Legacy — prefer env vars)

```bash
# Use `vercel env` instead of `vercel secrets` (deprecated)
```

---

## Local Dev Workflow

```bash
# 1. Link project (first time only)
vercel link

# 2. Pull env vars to local
vercel env pull .env.local

# 3. Develop locally with Next.js
npm run dev

# 4. Deploy preview to test
vercel

# 5. Check preview URL, verify everything works

# 6. If good, merge PR → auto-deploys to production
# Or force manual production deploy:
vercel --prod
```

---

## CI/CD Integration

### GitHub Actions (if needed beyond Vercel auto-deploy)

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint && npm run type-check
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### Required GitHub Secrets for CI/CD

| Secret | Value |
|--------|-------|
| `VERCEL_TOKEN` | From Vercel account tokens |
| `VERCEL_ORG_ID` | From `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | From `.vercel/project.json` |

---

## Monitoring & Debugging

### Check Deployment Health

```bash
# Recent deployments with status
vercel ls --limit 5

# Inspect a specific deployment
vercel inspect <url>

# Stream function logs (production)
vercel logs <production-url> --follow

# Check if build succeeded
vercel inspect <url> | grep -i state
```

### Common Issues

| Problem | Diagnosis | Fix |
|---------|-----------|-----|
| Build fails | `vercel logs <url>` | Check build output for errors |
| Env var missing | `vercel env ls production` | Add missing var to correct scope |
| 500 on API route | `vercel logs <url> --follow` | Check serverless function logs |
| Domain not working | `vercel domains inspect <domain>` | Check DNS config, wait for propagation |
| Stale build | Cache issue | `vercel deploy --force` |
| Edge function too large | Bundle > 25MB | Move heavy deps to Node.js runtime |
| Middleware not running | Wrong matcher config | Check `config.matcher` in middleware.ts |
| Preview URL 404 | Deployment still building | `vercel ls` to check status |

---

## Troubleshooting

| Problem | Command | Fix |
|---------|---------|-----|
| Not logged in | `vercel whoami` → error | `vercel login` |
| Wrong project linked | `vercel project inspect` | `rm -rf .vercel && vercel link` |
| Wrong team/org | `vercel switch` | Select correct team |
| Env vars not in build | Build logs show undefined | Verify scope matches (production vs preview) |
| CORS issues on API | Browser blocks requests | Add headers in `vercel.json` or `next.config.ts` |
| Cold start too slow | Function takes >3s first req | Use Edge Runtime for latency-sensitive routes |

---

## Anti-Patterns — DO NOT

- **NEVER** commit `.vercel/` directory — add to `.gitignore`
- **NEVER** commit `.env.local` — it contains pulled secrets
- **NEVER** use `vercel --prod` from a feature branch — only from `main`
- **NEVER** set `SUPABASE_SERVICE_ROLE_KEY` in the development scope — use local Supabase instead
- **NEVER** use `vercel secrets` — it's deprecated, use `vercel env` instead
- **NEVER** hardcode env values in `next.config.ts` — always use `process.env`
- **NEVER** deploy without checking `vercel env ls` first after a fresh project setup
