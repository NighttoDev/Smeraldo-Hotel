---
project_name: 'Smeraldo Hotel Management App'
user_name: 'Khoa'
date: '2026-02-16'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'code_quality', 'locale_formatting', 'anti_patterns', 'infrastructure']
status: 'complete'
rule_count: 45
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code for the Smeraldo Hotel management app. Read this file first before touching any code._

---

## Project Identity & Current State

### Names (CRITICAL — everything is called `manage-smeraldo-hotel`)

| What | Value |
|------|-------|
| Product name | Smeraldo Hotel (management app) |
| GitHub repo | `NighttoDev/manage-smeraldo-hotel` |
| App subfolder in repo | `manage-smeraldo-hotel/` |
| PM2 process on VPS | `manage-smeraldo-hotel` |
| VPS app directory | `/var/www/manage-smeraldo-hotel/manage-smeraldo-hotel/` |
| Live URL | `https://manage.smeraldohotel.online` |
| Supabase Studio | `https://manage.smeraldohotel.online:8088` (login: `supabase` / `8LYW0PkyjjLSZNxjQTL7Nw`) |

> `smeraldohotel.online` (apex domain) is a **completely separate project** — not related to this repo. Never touch it.

### Repository structure

```
/Users/khoatran/Downloads/Smeraldo Hotel/   ← git root (local)
  .github/workflows/deploy.yml              ← THE real CI/CD (edit this only)
  manage-smeraldo-hotel/                    ← SvelteKit app code
    src/
    supabase/migrations/
    ecosystem.config.cjs
    package.json
    ...
  _bmad-output/                             ← all planning + story docs live here
    implementation-artifacts/              ← story files (source of truth for tasks)
    planning-artifacts/                    ← architecture, epics, PRD
    infrastructure/REFERENCE.md            ← master VPS/infra reference
```

> ⚠ There is a ghost file at `manage-smeraldo-hotel/.github/workflows/deploy.yml` — it is NOT used by GitHub CI. Only `.github/workflows/deploy.yml` at repo root matters.

### Implementation status (as of 2026-02-16)

| Epic / Story | Status |
|-------------|--------|
| Epic 1 (1.1–1.4): Scaffold, DB, Auth, RBAC | ✅ Complete |
| Epic 2 (2.1–2.5): Room diagram, Realtime | ✅ Complete |
| Epic 3–7 | 🔜 Backlog — start with `/create-story` |

**Test count:** 52/52 passing. All CI checks green.

### VPS & deployment facts

- VPS IP: `103.47.225.24` | SSH: `sshpass -p '3CRa2OTV9FWPSmGb' ssh root@103.47.225.24`
- Supabase: self-hosted Docker Compose at `/opt/supabase`
- CI/CD: GitHub Actions → SSH deploy → `git pull` + `npm run build` + `pm2 reload` on VPS
- `PUBLIC_*` env vars are **baked at build time** — changing `.env` alone requires a rebuild
- Supabase containers need `docker compose down && docker compose up -d` (not restart) after `.env` changes
- Full infra reference: `_bmad-output/infrastructure/REFERENCE.md`

---

---

## Technology Stack & Versions

- **SvelteKit** 2.x with **Svelte 5** (runes syntax)
- **TypeScript** — strict mode enabled
- **Supabase** self-hosted (Docker Compose) — Postgres 15, Auth, Realtime, Storage
- **@supabase/ssr** — SSR-compatible Supabase client (NOT `@supabase/auth-helpers`)
- **@sveltejs/adapter-node** — Node.js output for VPS deployment
- **Tailwind CSS v3** — NOT v4 (shadcn-svelte compatibility)
- **shadcn-svelte** (Bits UI + Tailwind) — copy-paste components
- **Superforms** + **Zod** — form handling and validation
- **@vite-pwa/sveltekit** (Workbox) — PWA, Service Worker, Web Push
- **Vitest** — unit/integration tests
- **Playwright** — e2e tests only
- **PM2** — Node.js process management on VPS
- **Nginx** — reverse proxy + HTTPS termination

---

## Critical Implementation Rules

### TypeScript

- Strict mode is ON — never use `any`, use `unknown` + type guard instead
- All Supabase DB types come from `src/lib/db/types.ts` (Supabase CLI generated) — NEVER define DB types manually
- Regenerate types after schema changes: `npx supabase gen types typescript --local > src/lib/db/types.ts`
- Zod schemas live in `src/lib/db/schema.ts` and mirror DB types — use them for all input validation
- Always use `async/await`, never raw `.then()/.catch()` chains
- Import paths: use `$lib/` alias (SvelteKit), never relative `../../` from `src/`
- Export pattern: named exports only — no default exports except `.svelte` components, `+page/+layout` files, and tool config files (`vite.config.*`, `svelte.config.*`, `tailwind.config.*`, etc.)

### SvelteKit Server/Client Boundary (CRITICAL)

- `src/lib/server/` is **server-only** — SvelteKit throws a build error if `.svelte` files import from it
- All DB queries go through `src/lib/server/db/*.ts` — never call Supabase directly in components
- Auth/RBAC checks belong ONLY in `hooks.server.ts` or `+page.server.ts` — never in `.svelte` files
- Use `$lib/server/auth` in server files; use `sessionStore` (Svelte Store) in components for display

### SvelteKit Data Flow

- `+page.server.ts` handles data loading (server `load`) and form actions
- `+server.ts` handles REST API endpoints — always return `{ data, error }` envelope
- `+layout.server.ts` loads session data and enforces role gates for route groups
- `hooks.server.ts` runs on every request — session validation lives here

### Form Actions

- Use Form Actions (`?/actionName`) for all user-initiated mutations (check-in, attendance, stock)
- Use `+server.ts` REST endpoints for: offline sync queue flush, real-time triggered ops, push notifications
- Always pair Form Actions with Superforms + Zod on both server and client

### Svelte 5 Runes vs Stores (CRITICAL)

- `$state`, `$derived`, `$effect` — component-local only; NEVER pass rune-reactive values as props for shared state across component boundaries
- Use Svelte Stores (`writable`, `readable`) for any state shared across component boundaries
- Cross-component shared state: `$lib/stores/session.ts`, `$lib/stores/roomState.ts`, `$lib/stores/notifications.ts`
- Subscribe to stores in components with `$storeName` reactive syntax

### Supabase Realtime

- Subscribe to channels only in `+layout.svelte` (root) — never inside page components
- Always call `channel.unsubscribe()` in `onDestroy` to prevent memory leaks
- Realtime updates go to `roomStateStore` — components read from store, not directly from Realtime
- Channel names: `rooms:all` (all rooms), `room:{roomId}` (per room), `notifications:{staffId}`

### PWA / Offline

- Offline queue item structure: `{ id: string, action: string, payload: object, timestamp: string, retries: number }`
- Max 3 retries before surfacing error to user
- `api/sync/+server.ts` processes the queue on reconnect — all queued operations must be idempotent

### Testing

- Unit/integration tests: co-located `*.test.ts` next to source file (e.g., `formatVND.test.ts` beside `formatVND.ts`)
- Playwright e2e tests: `/tests/*.spec.ts` root folder ONLY — never co-located
- Mock Supabase client in unit tests — never hit real DB in unit tests
- Use `tests/fixtures/auth.ts` for shared login helpers — never repeat auth setup inline
- E2e tests must cover all 3 roles (manager, reception, housekeeping), especially access restriction paths

### Naming Conventions

- Database tables/columns: `snake_case` plural (e.g., `room_status_logs`, `staff_members`)
- Svelte components: `PascalCase.svelte` (e.g., `RoomCard.svelte`)
- Utility files: `camelCase.ts` (e.g., `formatVND.ts`)
- Zod schemas: `PascalCase` + `Schema` suffix (e.g., `BookingSchema`)
- Svelte Stores: `camelCase` + `Store` suffix (e.g., `roomStateStore`)
- Route params: `[camelCase]` (e.g., `[roomId]`, `[bookingId]`)
- Form action names: `camelCase` (e.g., `?/checkIn`, `?/markReady`)

### API Responses

- All `+server.ts` endpoints return: `{ data: T, error: null }` or `{ data: null, error: { message: string, code: string } }`
- Never expose raw Postgres/Supabase error messages to the client
- HTTP status codes: 200 success, 201 created, 400 bad input, 401 unauthenticated, 403 wrong role, 409 conflict, 500 server error

### Environment Variables

- `PUBLIC_` prefix: client-safe only (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`)
- No `PUBLIC_` prefix: server secrets (`SUPABASE_SERVICE_ROLE_KEY`)
- Never commit `.env` — only `.env.example` with empty values

---

## Locale & Data Formatting

- **Default locale:** `vi-VN` — all date/time display uses Vietnamese format
- **Date display:** ALWAYS use `Intl.DateTimeFormat('vi-VN')` → renders `15/02/2026` — never hardcode format strings
- **Date in JSON/DB:** ISO 8601 strings (`2026-02-15T14:30:00Z`) — never formatted strings or timestamps
- **Currency in DB/API:** integer VND, no decimals (e.g., `1500000`)
- **Currency display:** ALWAYS use `new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount)` → renders `1.500.000 ₫`
- **JSON field names:** `snake_case` — matches Postgres output, no camelCase conversion layer
- **Time format:** 24-hour clock (`HH:mm`) in all displays

---

## Critical Anti-Patterns — NEVER Do These

1. **Import `src/lib/server/` in `.svelte` files** — build will fail; use stores for display, server functions for data
2. **Hand-edit `src/lib/db/types.ts`** — always regenerate via `npx supabase gen types typescript --local`
3. **Put RBAC checks in `.svelte` components** — display-only there; server enforces access
4. **Use `$state` for cross-component shared state** — use Svelte Stores instead
5. **Subscribe to Supabase Realtime inside page components** — subscribe only in root `+layout.svelte`
6. **Forget `channel.unsubscribe()` in `onDestroy`** — causes memory leaks and duplicate broadcasts
7. **Store VND as float/decimal** — always integer in DB and API layer
8. **Hardcode date format strings** — always use `Intl.DateTimeFormat('vi-VN')`
9. **Use `@supabase/auth-helpers`** — deprecated; use `@supabase/ssr` instead
10. **Install Tailwind v4** — stay on v3 for shadcn-svelte compatibility until explicitly upgraded
11. **Call Supabase directly in components** — always go through `src/lib/server/db/*.ts`
12. **Return raw error objects to client** — always wrap in `{ data: null, error: { message, code } }`

---

## Usage Guidelines

**For AI Agents:**
- Read this file before implementing any code in this project
- Follow ALL rules exactly as documented — especially the anti-patterns
- When in doubt, prefer the more restrictive option (server-side, typed, validated)
- The architecture document at `_bmad-output/planning-artifacts/architecture.md` has full context

**For Humans:**
- Keep this file lean and focused on agent needs
- Update when technology stack changes (especially Supabase schema or package versions)
- Remove rules that become obvious once the codebase is established

_Last Updated: 2026-02-15_
