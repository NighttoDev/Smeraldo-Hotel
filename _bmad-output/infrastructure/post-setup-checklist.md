# Post-Setup Checklist — Smeraldo Hotel

Steps to run after the VPS is provisioned and the initial setup is complete.
All items below were executed on 2026-02-15 and are documented as a repeatable checklist.

---

## Status After Initial Setup

| Item | Status |
|------|--------|
| VPS provisioned (Ubuntu 25.04, 4CPU, 7.3GB RAM, 158GB disk) | ✅ |
| Docker, Nginx, Node.js 22, PM2 installed | ✅ |
| Supabase 13-container stack running (all healthy) | ✅ |
| Supabase Studio accessible at https://smeraldohotel.online:8088 | ✅ |
| SvelteKit app running via PM2 on port 3000 | ✅ |
| HTTPS live at https://smeraldohotel.online (cert expires 2026-05-16) | ✅ |
| GitHub Actions secrets set (SSH_PRIVATE_KEY, VPS_HOST, VPS_USER, PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY) | ✅ |
| Database migrations applied (4 migrations, 23 rooms seeded) | ✅ |
| Stories 1.1, 1.2, 1.3 marked done | ✅ |
| CI/CD pipeline passing (all 12 steps green) | ✅ |

---

## Step 1: Run Database Migrations

The migration files live in `smeraldo-hotel/supabase/migrations/`. Run them by copying
into the DB container and executing with `psql`.

```bash
# SSH into VPS
ssh root@103.47.225.24

# Copy migration files into the DB container
docker cp /var/www/smeraldo-hotel/smeraldo-hotel/supabase/migrations/00001_initial_schema.sql supabase-db:/tmp/
docker cp /var/www/smeraldo-hotel/smeraldo-hotel/supabase/migrations/00002_rls_policies.sql supabase-db:/tmp/
docker cp /var/www/smeraldo-hotel/smeraldo-hotel/supabase/migrations/00003_audit_trail.sql supabase-db:/tmp/
docker cp /var/www/smeraldo-hotel/smeraldo-hotel/supabase/migrations/00004_seed_rooms.sql supabase-db:/tmp/

# Run each migration (ON_ERROR_STOP=1 makes psql exit non-zero on any SQL error)
docker exec supabase-db psql -U postgres -v ON_ERROR_STOP=1 -f /tmp/00001_initial_schema.sql
docker exec supabase-db psql -U postgres -v ON_ERROR_STOP=1 -f /tmp/00002_rls_policies.sql
docker exec supabase-db psql -U postgres -v ON_ERROR_STOP=1 -f /tmp/00003_audit_trail.sql
docker exec supabase-db psql -U postgres -v ON_ERROR_STOP=1 -f /tmp/00004_seed_rooms.sql

# Verify rooms were seeded
docker exec supabase-db psql -U postgres -c "SELECT count(*) FROM public.rooms;"
# Expected: 23
```

> **Gotcha:** Running `psql` without `-v ON_ERROR_STOP=1` always exits 0 even when SQL statements fail.
> Always use that flag so failures are visible.

---

## Step 2: Generate TypeScript Types

After migrations are applied, regenerate `src/lib/db/types.ts` from the live schema.
Run this from your local machine inside the `smeraldo-hotel/` directory.

```bash
cd smeraldo-hotel

# Install Supabase CLI if not already installed
npm install -g supabase

# Generate types directly from the live DB
npx supabase gen types typescript \
  --db-url "postgresql://supabase_admin:<POSTGRES_PASSWORD>@103.47.225.24:5432/postgres" \
  > src/lib/db/types.ts
```

> **Note:** `src/lib/db/types.ts` is NEVER hand-edited — always regenerate via this command.
> Commit the updated file after each schema change.

---

## Step 3: Create First Manager Account

Supabase Auth handles users. Create the first manager via Studio, then link to `staff_members`.

### 3a. Create auth user via Supabase Studio

1. Open https://smeraldohotel.online:8088
2. Log in: username `supabase`, password `8LYW0PkyjjLSZNxjQTL7Nw`
3. Go to **Authentication → Users → Add User**
4. Set email + password for the manager (e.g. `manager@smeraldohotel.online`)
5. Copy the generated UUID

### 3b. Insert into staff_members

In Supabase Studio → **SQL Editor**, run:

```sql
INSERT INTO public.staff_members (id, full_name, role, is_active)
VALUES (
  '<uuid-from-auth-user>',
  'Nguyen Van A',        -- manager's full name
  'manager',
  true
);
```

### 3c. Test login

Open https://smeraldohotel.online and log in with the manager credentials.
Should redirect to `/dashboard`.

---

## Step 4: GitHub Actions CI/CD — GitHub Secrets Required

The pipeline requires these secrets set in GitHub repo settings:

| Secret | Value |
|--------|-------|
| `SSH_PRIVATE_KEY` | Contents of `/root/.ssh/github_actions` on VPS |
| `VPS_HOST` | `103.47.225.24` |
| `VPS_USER` | `root` |
| `PUBLIC_SUPABASE_URL` | `https://smeraldohotel.online` |
| `PUBLIC_SUPABASE_ANON_KEY` | The anon JWT key |

Set via CLI:
```bash
gh secret set PUBLIC_SUPABASE_URL --body "https://smeraldohotel.online" --repo NighttoDev/Smeraldo-Hotel
gh secret set PUBLIC_SUPABASE_ANON_KEY --body "<anon-key>" --repo NighttoDev/Smeraldo-Hotel
gh secret set SSH_PRIVATE_KEY --body "$(ssh root@103.47.225.24 cat /root/.ssh/github_actions)" --repo NighttoDev/Smeraldo-Hotel
gh secret set VPS_HOST --body "103.47.225.24" --repo NighttoDev/Smeraldo-Hotel
gh secret set VPS_USER --body "root" --repo NighttoDev/Smeraldo-Hotel
```

### CI/CD Pipeline Steps (all must pass)

```
lint → typecheck → unit tests → build → SSH deploy → PM2 reload
```

### CI/CD Gotchas

1. **`deploy.yml` must be at repo root** — Place it at `.github/workflows/deploy.yml`
   (not inside `smeraldo-hotel/.github/`). GitHub Actions only reads workflows from
   the repository root.

2. **`cache-dependency-path` required** — Since `package-lock.json` is in a subdirectory,
   `setup-node@v4` needs the explicit path:
   ```yaml
   - uses: actions/setup-node@v4
     with:
       node-version: 22
       cache: 'npm'
       cache-dependency-path: smeraldo-hotel/package-lock.json
   ```

3. **`PUBLIC_` env vars required at check time** — `svelte-check` fails without them.
   Add to the job-level `env` block:
   ```yaml
   jobs:
     build-and-deploy:
       env:
         PUBLIC_SUPABASE_URL: ${{ secrets.PUBLIC_SUPABASE_URL }}
         PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.PUBLIC_SUPABASE_ANON_KEY }}
   ```

4. **`working-directory: smeraldo-hotel`** required on all npm steps since the app
   is in a subdirectory of the repo.

---

## Step 5: Add www. DNS (Optional)

If you want `www.smeraldohotel.online` to work:

1. In your domain registrar, add a CNAME record: `www → smeraldohotel.online`
2. Wait for DNS propagation, then run on VPS:
   ```bash
   certbot --nginx -d smeraldohotel.online -d www.smeraldohotel.online \
     --non-interactive --agree-tos --email admin@smeraldohotel.online
   ```

---

## Adding Future Migrations

When a new story requires schema changes:

```bash
# 1. Create new migration file (next number in sequence)
# e.g. smeraldo-hotel/supabase/migrations/00005_add_something.sql

# 2. Copy to VPS and apply
scp smeraldo-hotel/supabase/migrations/00005_add_something.sql root@103.47.225.24:/tmp/
ssh root@103.47.225.24 \
  "docker exec supabase-db psql -U postgres -v ON_ERROR_STOP=1 -f /tmp/00005_add_something.sql"

# 3. Regenerate TypeScript types
npx supabase gen types typescript \
  --db-url "postgresql://supabase_admin:<password>@103.47.225.24:5432/postgres" \
  > smeraldo-hotel/src/lib/db/types.ts

# 4. Commit and push
git add smeraldo-hotel/supabase/migrations/00005_add_something.sql smeraldo-hotel/src/lib/db/types.ts
git commit -m "db: add <description>"
git push origin main
```

---

## Quick Reference — What's Running Where

| Service | Host | Port | Notes |
|---------|------|------|-------|
| SvelteKit app | PM2 | 3000 (internal) | Served via Nginx → port 443 |
| Supabase Kong gateway | Docker | 8000 (external) | API entry point |
| Supabase Studio | Docker | 3001 (internal) | Served via Nginx → port 8088 |
| Supabase Postgres | Docker | 5432 (external) | Direct DB access |
| Nginx | systemd | 80, 443, 8088 | Reverse proxy |

## Quick Reference — Credentials

| Item | Value |
|------|-------|
| VPS SSH | `ssh root@103.47.225.24` |
| Supabase Studio | https://smeraldohotel.online:8088 (user: `supabase`) |
| Studio password | `8LYW0PkyjjLSZNxjQTL7Nw` |
| DB user | `supabase_admin` |
| DB password | `4dkhU4n7oyPBODf7VH2lYdf1f-DemJKW6gAPI3WQ37I` |
| Supabase dir | `/opt/supabase` |
| App dir | `/var/www/smeraldo-hotel/smeraldo-hotel` |
