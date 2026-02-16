# Smeraldo Hotel — Master Reference
> Last updated: 2026-02-16. Read this file first after any context loss.

---

## 1. Repository Structure (CRITICAL)

```
/Users/khoatran/Downloads/Smeraldo Hotel/   ← GIT ROOT (this is the actual repo)
  .github/
    workflows/
      deploy.yml                             ← THE REAL CI/CD WORKFLOW (edit this one)
  manage-smeraldo-hotel/                            ← SvelteKit app code lives here
    .github/
      workflows/
        deploy.yml                           ← ⚠ GHOST FILE — not used by GitHub CI, ignore it
    src/
    package.json
    svelte.config.js
    ...
  _bmad-output/                              ← Planning docs, stories, infrastructure
  _bmad/                                     ← BMAD framework
```

**The #1 trap:** There are TWO `deploy.yml` files. GitHub only reads
`.github/workflows/deploy.yml` at the repo root. All CI edits must go there.

### Git commands
```bash
# Always commit/push from the REPO ROOT, not from manage-smeraldo-hotel/
cd "/Users/khoatran/Downloads/Smeraldo Hotel"
git add .github/workflows/deploy.yml   # correct
git add manage-smeraldo-hotel/...             # also correct — app code

# The remote
git remote -v  # → https://github.com/NighttoDev/manage-smeraldo-hotel.git
```

---

## 2. VPS Access

| Key | Value |
|-----|-------|
| IP | `103.47.225.24` |
| SSH | `ssh root@103.47.225.24` |
| Domain | `https://manage.smeraldohotel.online` (apex `smeraldohotel.online` is a separate project — not handled by this Nginx config) |
| OS | Ubuntu 25.04 |
| App dir | `/var/www/manage-smeraldo-hotel/manage-smeraldo-hotel` |
| Supabase dir | `/opt/supabase` |

> SSH password: `3CRa2OTV9FWPSmGb` (VPS provider: server ID 2350517)
> Local `~/.ssh/id_ed25519` is NOT authorized. Use password or sshpass:
> `sshpass -p '3CRa2OTV9FWPSmGb' ssh -o StrictHostKeyChecking=no root@103.47.225.24`

**Get Supabase keys from VPS:**
```bash
ssh root@103.47.225.24 "grep -E 'ANON_KEY|SERVICE_ROLE_KEY' /opt/supabase/.env"
```

---

## 3. Supabase (Self-Hosted)

| Item | Value |
|------|-------|
| Studio URL | `https://manage.smeraldohotel.online:8088` |
| Studio login | `supabase` / `8LYW0PkyjjLSZNxjQTL7Nw` |
| DB user | `supabase_admin` |
| DB password | `4dkhU4n7oyPBODf7VH2lYdf1f-DemJKW6gAPI3WQ37I` |
| DB port | `5432` |
| ANON_KEY | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNjQxNzY5MjAwLCJleHAiOjE5NTY1ODUyMDB9.odbgX9N1pmbSeGoFoypd_gzJKqiTuLP-QCgiFQeSM7k` |
| SERVICE_ROLE_KEY | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTk1NjU4NTIwMH0.VNFtm7FSEaO9Sb5GdqXOzaFxNsoyjs87TpqpWHRl96g` |

**Supabase services:**
```
Kong gateway  → https://manage.smeraldohotel.online/rest/v1/ (via Nginx)
Auth          → https://manage.smeraldohotel.online/auth/v1/
Realtime      → https://manage.smeraldohotel.online/realtime/v1/
Storage       → https://manage.smeraldohotel.online/storage/v1/
Studio        → https://manage.smeraldohotel.online:8088
```

**Restart Supabase:**
```bash
ssh root@103.47.225.24 "cd /opt/supabase && docker compose restart"
```

---

## 4. GitHub Secrets (all set as of 2026-02-15)

| Secret | Value |
|--------|-------|
| `VPS_HOST` | `103.47.225.24` |
| `VPS_USER` | `root` |
| `SSH_PRIVATE_KEY` | contents of `/root/.ssh/github_actions` on VPS |
| `PUBLIC_SUPABASE_URL` | `https://manage.smeraldohotel.online` |
| `PUBLIC_SUPABASE_ANON_KEY` | ANON_KEY above |
| `SUPABASE_SERVICE_ROLE_KEY` | SERVICE_ROLE_KEY above |

**Verify / re-set secrets:**
```bash
gh secret list --repo NighttoDev/manage-smeraldo-hotel
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "eyJ..." --repo NighttoDev/manage-smeraldo-hotel
```

---

## 5. CI/CD Pipeline

File: `.github/workflows/deploy.yml` (repo root — the only one that matters)

Steps: `install → lint → type-check → unit tests → build → SSH deploy`

**Job-level env block (required for svelte-check to generate types):**
```yaml
env:
  PUBLIC_SUPABASE_URL: ${{ secrets.PUBLIC_SUPABASE_URL }}
  PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.PUBLIC_SUPABASE_ANON_KEY }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

**Deploy script on VPS:**
```bash
cd /var/www/manage-smeraldo-hotel && git pull origin main
cd manage-smeraldo-hotel && npm ci && npm run build
npm prune --omit=dev && pm2 reload manage-smeraldo-hotel
```

---

## 6. Local Development

```bash
cd "/Users/khoatran/Downloads/Smeraldo Hotel/manage-smeraldo-hotel"

# Env file (local dev — uses Supabase local or remote)
cp .env.example .env   # then fill in values

# Run dev server
npm run dev

# Validate before committing
npm run lint       # 0 errors required
npm run check      # 0 errors required (2 known Svelte 5 warnings are OK)
npm test           # all tests must pass
npm run build      # must succeed
```

**Local `.env` for production remote:**
```
PUBLIC_SUPABASE_URL=https://manage.smeraldohotel.online
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNjQxNzY5MjAwLCJleHAiOjE5NTY1ODUyMDB9.odbgX9N1pmbSeGoFoypd_gzJKqiTuLP-QCgiFQeSM7k
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTk1NjU4NTIwMH0.VNFtm7FSEaO9Sb5GdqXOzaFxNsoyjs87TpqpWHRl96g
DATABASE_URL=postgresql://supabase_admin:4dkhU4n7oyPBODf7VH2lYdf1f-DemJKW6gAPI3WQ37I@103.47.225.24:5432/postgres
```

---

## 7. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | SvelteKit 2.x + Svelte 5 (runes: `$props`, `$state`, `$derived`) |
| Styling | Tailwind CSS v3 |
| Forms | sveltekit-superforms 2.29.1 + Zod v4 (`zod4` adapter) |
| Auth | Supabase Auth (session via `@supabase/ssr`) |
| DB | Supabase Postgres (self-hosted) + RLS |
| Runtime | Node.js 22, adapter-node, PM2 |
| Tests | Vitest |
| CI/CD | GitHub Actions → SSH deploy to VPS |

**Key coding rules (from project-context.md):**
- Never use `any` — define narrow interfaces
- Always pair Form Actions with `superValidate` + Zod on both server and client
- Svelte 5 runes only — no legacy `export let`, `$:`, `onMount`
- Zod v4 API: `z.enum([...], { error: '...' })`, not `.describe()`

---

## 8. Project Status (as of 2026-02-16)

| Story | Status |
|-------|--------|
| 1.1 — Project scaffold + CI/CD | ✅ done |
| 1.2 — DB schema, RLS, migrations | ✅ done |
| 1.3 — Staff login / session / logout | ✅ done |
| 1.4 — RBAC + Staff account management | ✅ done |
| 2.1–2.5 — Live room diagram + Realtime | ✅ done |
| Domain migration to manage.* | ✅ done (2026-02-16) |
| Epic 3+ | backlog |

**Test count:** 52/52 passing across 8 test files.

---

## 9. Adding Future DB Migrations

```bash
# 1. Create migration file
# manage-smeraldo-hotel/supabase/migrations/00005_add_something.sql

# 2. Apply to VPS
scp manage-smeraldo-hotel/supabase/migrations/00005_add_something.sql root@103.47.225.24:/tmp/
ssh root@103.47.225.24 \
  "docker exec supabase-db psql -U postgres -v ON_ERROR_STOP=1 -f /tmp/00005_add_something.sql"

# 3. Regenerate TypeScript types
cd manage-smeraldo-hotel
npx supabase gen types typescript \
  --db-url "postgresql://supabase_admin:4dkhU4n7oyPBODf7VH2lYdf1f-DemJKW6gAPI3WQ37I@103.47.225.24:5432/postgres" \
  > src/lib/db/types.ts

# 4. Commit from REPO ROOT
cd "/Users/khoatran/Downloads/Smeraldo Hotel"
git add manage-smeraldo-hotel/supabase/migrations/00005_add_something.sql manage-smeraldo-hotel/src/lib/db/types.ts
git commit -m "db: add <description>"
git push origin main
```

---

## 10. Common VPS Operations

```bash
# View app logs
ssh root@103.47.225.24 "pm2 logs manage-smeraldo-hotel --lines 50"

# Restart app
ssh root@103.47.225.24 "pm2 reload manage-smeraldo-hotel"

# View Supabase logs
ssh root@103.47.225.24 "cd /opt/supabase && docker compose logs -f --tail=50"

# Manual redeploy
ssh root@103.47.225.24 "cd /var/www/manage-smeraldo-hotel && git pull origin main && cd manage-smeraldo-hotel && npm ci && npm run build && npm prune --omit=dev && pm2 reload manage-smeraldo-hotel"

# Check running processes
ssh root@103.47.225.24 "pm2 list && docker ps --format 'table {{.Names}}\t{{.Status}}'"
```

---

## 11. Domain Migration Record (2026-02-16)

### What changed

| Item | Before | After |
|------|--------|-------|
| App URL | `https://smeraldohotel.online` | `https://manage.smeraldohotel.online` |
| Supabase API | `https://smeraldohotel.online/rest/v1/` etc. | `https://manage.smeraldohotel.online/rest/v1/` etc. |
| Supabase Studio | `https://smeraldohotel.online:8088` | `https://manage.smeraldohotel.online:8088` |
| `smeraldohotel.online` | Served the app | Blank 200 — reserved for a separate project |
| GitHub Secret `PUBLIC_SUPABASE_URL` | `https://smeraldohotel.online` | `https://manage.smeraldohotel.online` |
| VPS app `.env` `PUBLIC_SUPABASE_URL` | `https://smeraldohotel.online` | `https://manage.smeraldohotel.online` |
| Supabase `.env` (`SUPABASE_PUBLIC_URL`, `API_EXTERNAL_URL`, `SITE_URL`) | `smeraldohotel.online` | `manage.smeraldohotel.online` |

### Steps executed (in order)

1. Added DNS A record `manage.smeraldohotel.online → 103.47.225.24` in Namecheap (TTL 300)
2. Issued Certbot TLS cert: `certbot certonly --nginx -d manage.smeraldohotel.online`
   - Cert path: `/etc/letsencrypt/live/manage.smeraldohotel.online/` — expires 2026-05-17
3. Replaced `/etc/nginx/sites-available/smeraldo` with 3-block config:
   - Block 1: `manage.smeraldohotel.online:443` — app + all Supabase API proxy paths
   - Block 2: `manage.smeraldohotel.online:8088` — Supabase Studio
   - Block 3: `smeraldohotel.online:443` — blank 200, SSL cert kept, reserved for separate project
   - Block 4: HTTP→HTTPS redirect for both domains (acme-challenge exemption for cert renewals)
4. Updated `/opt/supabase/.env`: `SUPABASE_PUBLIC_URL`, `API_EXTERNAL_URL`, `SITE_URL` → `manage.*`
5. Recreated Supabase containers: `docker compose down && docker compose up -d`
6. Updated `/var/www/manage-smeraldo-hotel/manage-smeraldo-hotel/.env`: `PUBLIC_SUPABASE_URL` → `manage.*`
7. Updated GitHub Secret `PUBLIC_SUPABASE_URL` → `https://manage.smeraldohotel.online`
8. Pushed empty commit to trigger CI rebuild — bakes new `PUBLIC_SUPABASE_URL` into build

### Current Nginx config summary

```
manage.smeraldohotel.online:443  → app (127.0.0.1:3000) + Supabase API (127.0.0.1:8000)
manage.smeraldohotel.online:8088 → Studio (127.0.0.1:3001)
smeraldohotel.online             → NOT in this Nginx config — separate project, separate repo
:80 manage.smeraldohotel.online  → 301 to https://manage.smeraldohotel.online
```

### Key facts to remember

- `smeraldohotel.online` is completely decoupled — has its own cert at `/etc/letsencrypt/live/smeraldohotel.online/` but no Nginx config in this project
- `manage.smeraldohotel.online` cert at `/etc/letsencrypt/live/manage.smeraldohotel.online/` — expires 2026-05-17, auto-renews
- `PUBLIC_*` vars in SvelteKit adapter-node are **baked at compile time** — changing `.env` alone is not enough, must rebuild
- CI SSH deploy step runs `npm run build` ON THE VPS using VPS `.env` — the GitHub Secret governs the CI runner build; the VPS `.env` governs the production build
- All Supabase containers must be **recreated** (not restarted) after `.env` change: `docker compose down && docker compose up -d`
- `smeraldohotel.online` browser redirect cache: old 301 may be cached in browsers — test in incognito

---

## 12. Project Rename Record (2026-02-16)

### What changed

| Item | Before | After |
|------|--------|-------|
| GitHub repo | `NighttoDev/Smeraldo-Hotel` | `NighttoDev/manage-smeraldo-hotel` |
| VPS app directory | `/var/www/smeraldo-hotel/smeraldo-hotel/` | `/var/www/manage-smeraldo-hotel/manage-smeraldo-hotel/` |
| PM2 process name | `smeraldo-hotel` | `manage-smeraldo-hotel` |
| App folder in repo | `smeraldo-hotel/` | `manage-smeraldo-hotel/` |
| `ecosystem.config.cjs` | VPS-only, old paths | Added to repo, all paths updated |
| `deploy.yml` VPS path | `/var/www/smeraldo-hotel` | `/var/www/manage-smeraldo-hotel` |
| `deploy.yml` PM2 name | `pm2 reload smeraldo-hotel` | `pm2 reload manage-smeraldo-hotel` |

### Steps executed (in order)

1. Renamed GitHub repo: `gh repo rename manage-smeraldo-hotel --repo NighttoDev/Smeraldo-Hotel`
2. Updated local git remote: `git remote set-url origin https://github.com/NighttoDev/manage-smeraldo-hotel.git`
3. Renamed VPS outer dir: `mv /var/www/smeraldo-hotel /var/www/manage-smeraldo-hotel`
4. Updated VPS git remote: `cd /var/www/manage-smeraldo-hotel && git remote set-url origin https://github.com/NighttoDev/manage-smeraldo-hotel.git`
5. Updated `ecosystem.config.cjs` on VPS — new `name`, `cwd`, `env_file` paths
6. Deleted old PM2 process, started new one: `pm2 delete smeraldo-hotel && pm2 start ecosystem.config.cjs && pm2 save`
7. Updated `deploy.yml` — VPS path and PM2 name
8. Added `ecosystem.config.cjs` to repo (was VPS-only before)
9. Renamed app subfolder in repo: `git mv smeraldo-hotel manage-smeraldo-hotel`
10. Renamed app subfolder on VPS: `mv manage-smeraldo-hotel/smeraldo-hotel manage-smeraldo-hotel/manage-smeraldo-hotel`
11. Hard-reset VPS git to sync with remote: `git fetch origin main && git reset --hard origin/main`
12. Rebuilt app on VPS and reloaded PM2
13. Fixed doubled-prefix bug in `deploy.yml` (`manage-manage-smeraldo-hotel` → `manage-smeraldo-hotel`) caused by `replace_all` on a name that already contained the prefix

### Gotcha to remember

**`replace_all` on `smeraldo-hotel` will corrupt any string that already contains `manage-smeraldo-hotel`** — it replaces the `smeraldo-hotel` substring inside it, producing `manage-manage-smeraldo-hotel`. Always use exact string matching when renaming partially-overlapping names.

### Final structure on VPS

```
/var/www/manage-smeraldo-hotel/        ← git repo root
    manage-smeraldo-hotel/             ← SvelteKit app code
        build/                         ← compiled output
        src/
        ecosystem.config.cjs
        .env                           ← not in git, contains secrets
        package.json
        ...
    _bmad-output/                      ← planning docs
```
