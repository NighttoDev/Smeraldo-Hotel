---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-02-15'
inputDocuments:
  - "_bmad-output/planning-artifacts/prd.md"
workflowType: 'architecture'
project_name: 'Smeraldo Hotel'
user_name: 'Khoa'
date: '2026-02-15'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
54 FRs across 9 domains: Authentication (FR1–5), Room Management (FR6–16), Booking Management (FR17–24), Guest Management (FR25–28), Staff Attendance (FR29–33), Inventory Management (FR34–41), Reporting & Dashboard (FR42–46), Notifications & Alerts (FR47–49), Offline/PWA (FR50–54).

Architecturally, the heaviest modules are Room Management (real-time state machine with 5 status transitions) and Booking Management (concurrent access + long-stay support). Attendance and Inventory are CRUD-dominant with low complexity.

**Non-Functional Requirements:**
- Performance: < 3s initial load, < 1s cached, < 3s real-time propagation
- Security: HTTPS-only, 8h session expiry, server-side RBAC, immutable audit trail
- Reliability: 99%+ uptime (06:00–midnight), RPO ≤ 24h, offline data integrity
- Accessibility: WCAG 2.1 Level A; color + text labels for room status
- Integration: Web Push API, W3C Service Worker spec

**Scale & Complexity:**
- Primary domain: Full-stack web (SPA + PWA)
- Complexity level: Medium
- Estimated architectural components: ~8 feature modules + 4 infrastructure layers (auth, real-time, offline sync, RBAC)

### Technical Constraints & Dependencies

- Must be a PWA (Web App Manifest + Service Worker) — no App Store distribution
- Real-time: < 3s propagation mandate constrains choice of sync mechanism
- Vietnamese locale (`vi-VN`) as default; VND currency (no decimals)
- Desktop-first with functional mobile for housekeeping role
- No OTA API integration in MVP — manual booking entry only
- Small dev team (1–2 devs) — architecture must support parallel module development

### Cross-Cutting Concerns Identified

1. **Real-time state propagation** — affects Room, Booking, Notification modules
2. **RBAC enforcement** — every data access path must validate role server-side
3. **Offline/online state machine** — affects all write operations (queue → sync)
4. **Audit trail** — room status changes, check-in/out require immutable logging
5. **Locale & formatting** — dates, currency, time across all display surfaces
6. **Concurrent write conflict resolution** — room status last-write-wins server-side

---

## Starter Template Evaluation

### Primary Technology Domain

Full-stack SPA + PWA (web application) based on project requirements analysis.

### Starter Options Considered

- `npm create svelte@latest` (official SvelteKit CLI) — minimal, TypeScript, fully configurable
- `engageintellect/sveltekit-supabase` — Svelte 5 + Supabase + shadcn-svelte (opinionated, too much pre-baked auth UI)
- `devstein/sveltekit-starter` — TypeScript + Tailwind + Supabase + Playwright (solid but dated)

**Selected:** Official SvelteKit CLI + manual integration — gives full control over adapter and PWA setup which the community starters don't configure for self-hosted VPS.

### Selected Starter: Official SvelteKit CLI + manual Supabase + PWA integration

**Rationale for Selection:**
Self-hosted VPS deployment requires `adapter-node`, PWA requires `@vite-pwa/sveltekit`, and Supabase SSR auth requires specific hooks setup. Community starters assume cloud deployment. The official CLI scaffold + manual additions gives precise control with no opinionated bloat.

**Initialization Command:**

```bash
npm create svelte@latest manage-smeraldo-hotel
# Options: Minimal app, TypeScript, ESLint, Prettier, Vitest, Playwright
cd manage-smeraldo-hotel
npm install @sveltejs/adapter-node
npm install @supabase/supabase-js @supabase/ssr
npm install -D @vite-pwa/sveltekit
npx svelte-add@latest tailwindcss
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:** TypeScript throughout — frontend components, server hooks, API routes, and type-generated Supabase schema types via `supabase gen types typescript`

**Adapter:** `@sveltejs/adapter-node` — outputs a standalone Node.js server binary for VPS deployment; managed via PM2 or Docker

**Styling Solution:** Tailwind CSS v4 — utility-first, desktop-first responsive; configured with `vi-VN` typography considerations

**Build Tooling:** Vite (embedded in SvelteKit) — fast HMR in dev, optimized production bundles with code splitting per route

**Testing Framework:** Vitest (unit/integration) + Playwright (e2e browser automation)

**Code Organization:** SvelteKit file-based routing — `src/routes/` for pages, `src/lib/` for shared logic, `src/lib/server/` for server-only code (enforced by SvelteKit at build time)

**Development Experience:** Hot module replacement, TypeScript strict mode, ESLint + Prettier pre-configured, Supabase type generation script in `package.json`

**Real-time:** Supabase Realtime (WebSocket) — satisfies < 3s room status propagation NFR natively via Supabase self-hosted stack

**Auth:** Supabase Auth with `@supabase/ssr` — server-side session cookies enforced in `hooks.server.ts`; RBAC validated server-side on every request

**PWA:** `@vite-pwa/sveltekit` — generates Service Worker (Workbox), Web App Manifest, offline cache strategy, and enables Web Push API for notifications

**Deployment:** Node.js process on self-hosted VPS — PM2 for process management, Nginx as reverse proxy, Supabase stack via Docker Compose on same or separate VPS

**Note:** Project initialization using this command should be the first implementation story.

---

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- RBAC enforcement: Hybrid RLS + server-side hooks
- API pattern: Hybrid Form Actions + REST endpoints
- State management: Svelte 5 Runes + Svelte Stores for cross-component state
- Data validation: Zod + Superforms
- Migrations: Supabase CLI

**Important Decisions (Shape Architecture):**
- UI components: shadcn-svelte
- Process management: PM2
- Reverse proxy: Nginx + Let's Encrypt
- CI/CD: GitHub Actions → SSH deploy
- Type sharing: Supabase CLI generated types

**Deferred Decisions (Post-MVP):**
- Error tracking: Sentry (after growth warrants it)
- Containerisation: Docker (if team or scale grows)
- OTA API integration: Phase 3

---

### Data Architecture

| Decision | Choice | Rationale |
|---|---|---|
| RBAC enforcement | Hybrid: Supabase RLS + SvelteKit server hooks | RLS as security net; hooks provide clear error messages |
| Data validation | Zod | Mature, TypeScript-native, integrates with Superforms |
| Database migrations | Supabase CLI (`supabase migration new`) | Version-controlled SQL, standard for self-hosted Supabase |
| Caching | SvelteKit `load` cache + Supabase Realtime invalidation | No Redis needed at MVP scale (5 users, 23 rooms) |
| Type generation | `supabase gen types typescript` → `src/lib/db/types.ts` | Single source of truth for DB schema types |

**RBAC Role Matrix:**

| Resource | Manager | Reception | Housekeeping |
|---|---|---|---|
| Room status read | ✅ | ✅ | ✅ (assigned rooms only) |
| Room status write | ✅ | ✅ | ✅ (Cleaned/Ready only) |
| Booking read/write | ✅ | ✅ | ❌ |
| Attendance read/write | ✅ | ✅ (log only) | ❌ |
| Inventory read/write | ✅ | ✅ | ❌ |
| Financial data | ✅ | ❌ | ❌ |
| Staff account management | ✅ | ❌ | ❌ |

---

### Authentication & Security

| Decision | Choice | Rationale |
|---|---|---|
| Auth provider | Supabase Auth | Native to Supabase stack, supports SSR cookie sessions |
| Session strategy | `@supabase/ssr` server-side cookies | Role enforced server-side on every request via `hooks.server.ts` |
| Session expiry | 8 hours of inactivity | Per NFR-S2 |
| Transport security | HTTPS-only via Nginx + Certbot (Let's Encrypt) | Per NFR-S1 |
| Audit trail | Immutable Postgres table with RLS (insert-only policy) | Room status changes, check-in/out logged with user + timestamp |
| Password storage | Supabase Auth handles (bcrypt) | No custom implementation needed |

---

### API & Communication Patterns

| Decision | Choice | Rationale |
|---|---|---|
| Form mutations | SvelteKit Form Actions | Progressive enhancement; attendance, inventory, booking forms |
| Real-time / async ops | SvelteKit `+server.ts` REST endpoints | Offline sync queue, real-time callbacks, housekeeping status push |
| Real-time transport | Supabase Realtime (WebSocket) | Satisfies < 3s room status propagation; self-hosted stack includes it |
| Offline sync | IndexedDB queue → REST endpoint on reconnect | PWA Service Worker manages queue; background sync on reconnect |
| Error handling | Standardised `{ error: string, code: string }` JSON response | Consistent across all REST endpoints |
| API documentation | TypeScript types + JSDoc inline | No OpenAPI at MVP scale; revisit post-MVP |

---

### Frontend Architecture

| Decision | Choice | Rationale |
|---|---|---|
| Routing | SvelteKit file-based routing | Built-in, supports layout nesting by role |
| State management | Svelte 5 Runes (`$state`, `$derived`) for component state; Svelte Stores for cross-component (user session, room state) | Idiomatic Svelte 5; stores for shared real-time state |
| Component library | shadcn-svelte (Bits UI + Tailwind) | Copy-paste, no runtime dependency, fully customisable |
| Form handling | Superforms + Zod | Type-safe, server+client validation, SvelteKit-native |
| Responsive strategy | Desktop-first layouts; bottom nav on mobile (housekeeping role) | Per PRD: reception/manager desktop, housekeeping mobile |
| Locale / i18n | `vi-VN` default via `Intl` API; `DD/MM/YYYY`, VND no decimals | Per NFR: Vietnamese locale baked into all display surfaces |
| PWA | `@vite-pwa/sveltekit` (Workbox) | Service Worker, offline cache, Web App Manifest, Web Push |

---

### Infrastructure & Deployment

| Decision | Choice | Rationale |
|---|---|---|
| SvelteKit adapter | `@sveltejs/adapter-node` | Self-hosted VPS Node.js output |
| Process management | PM2 | Simple auto-restart, log rotation, no Docker overhead at MVP |
| Reverse proxy | Nginx | HTTPS termination, proxy to Node.js, static asset serving |
| TLS certificates | Certbot + Let's Encrypt (auto-renew) | Free, automated HTTPS |
| Supabase hosting | Self-hosted Docker Compose stack | Postgres + Auth + Realtime + Storage on same or dedicated VPS |
| CI/CD | GitHub Actions → SSH deploy script | Push-to-deploy: lint → typecheck → test → build → PM2 reload |
| Backups | Supabase CLI `db dump` on cron (daily) | Satisfies RPO ≤ 24h per NFR-R3 |
| Monitoring (MVP) | PM2 logs + Nginx access logs | Sufficient at 5-user scale |

### Decision Impact Analysis

**Implementation Sequence:**
1. VPS provisioning + Nginx + Certbot + Supabase Docker stack
2. SvelteKit project scaffold + adapter-node + all packages installed
3. Supabase schema + RLS policies + migrations baseline
4. Auth / session / RBAC middleware (`hooks.server.ts`)
5. Core feature modules (Room → Booking → Attendance → Inventory)
6. Real-time subscriptions (Supabase Realtime channels)
7. PWA Service Worker + offline queue
8. PM2 + GitHub Actions CI/CD pipeline

**Cross-Component Dependencies:**
- RLS policies must exist before any feature module is built — they gate all data access
- `hooks.server.ts` auth check must be complete before role-gated routes are implemented
- Supabase Realtime channel setup must precede room diagram live-update feature
- Offline sync queue depends on both PWA Service Worker and REST sync endpoint being complete

---

## Implementation Patterns & Consistency Rules

### Critical Conflict Points Identified

8 areas where AI agents could make different choices without explicit rules: naming conventions, file structure, API response format, date/currency handling, RBAC placement, state management boundaries, test placement, and environment variable prefixing.

---

### Naming Patterns

**Database Naming Conventions:**
- Tables: `snake_case` plural — `bookings`, `room_status_logs`, `staff_members`, `inventory_items`
- Columns: `snake_case` — `check_in_date`, `created_at`, `staff_id`, `room_number`
- Foreign keys: `{table_singular}_id` — `booking_id`, `room_id`, `staff_id`
- Indexes: `idx_{table}_{column(s)}` — `idx_bookings_room_id`, `idx_rooms_floor`
- Enum values: `snake_case` — `being_cleaned`, `checking_out_today`, `available`, `occupied`

**API Naming Conventions:**
- Endpoints: plural resource nouns — `/api/rooms`, `/api/bookings`, `/api/staff`
- Nested resources: `/api/rooms/[roomId]/status`, `/api/bookings/[bookingId]/check-in`
- Query params: `snake_case` — `?check_in_date=`, `?staff_id=`, `?floor=`
- Form Action names: `camelCase` — `?/checkIn`, `?/checkOut`, `?/markReady`, `?/logAttendance`

**Code Naming Conventions:**
- Svelte components: `PascalCase.svelte` — `RoomCard.svelte`, `BookingForm.svelte`, `AttendanceRow.svelte`
- Utility files: `camelCase.ts` — `formatVND.ts`, `parseDate.ts`, `roomStatus.ts`
- Zod schemas: `PascalCase` + `Schema` suffix — `BookingSchema`, `RoomStatusSchema`, `AttendanceSchema`
- Svelte Stores: `camelCase` + `Store` suffix — `roomStateStore`, `sessionStore`, `notificationStore`
- Svelte 5 rune variables: `camelCase` — `let isLoading = $state(false)`, `let roomStatus = $state('available')`
- DB types file: `src/lib/db/types.ts` — generated only, never hand-edited
- Route params: `[camelCase]` — `[roomId]`, `[bookingId]`, `[staffId]`
- Route group folders: `(kebab-case)` — `(manager)`, `(reception)`, `(housekeeping)`

---

### Structure Patterns

**Project Organisation:**
```
src/
  lib/
    components/
      ui/              # shadcn-svelte primitives (Button, Dialog, Badge, etc.)
      rooms/           # RoomCard.svelte, RoomDiagram.svelte, StatusBadge.svelte
      bookings/        # BookingForm.svelte, BookingRow.svelte
      attendance/      # AttendanceTable.svelte, ShiftInput.svelte
      inventory/       # InventoryRow.svelte, StockForm.svelte
      layout/          # Sidebar.svelte, BottomNav.svelte, PageHeader.svelte
    server/            # Server-only — never imported in .svelte files
      db/              # Supabase query functions per domain
        rooms.ts       # getRooms(), updateRoomStatus(), etc.
        bookings.ts
        attendance.ts
        inventory.ts
      auth.ts          # getSession(), requireRole(), hasRole()
    db/
      types.ts         # Supabase CLI generated — DO NOT EDIT
      schema.ts        # Zod schemas matching DB types
    stores/            # Cross-component Svelte Stores
      session.ts       # Current user + role
      roomState.ts     # Live room map from Realtime
      notifications.ts # Push notification queue
    utils/
      formatVND.ts     # Currency display
      parseDate.ts     # Date parsing and display helpers
      roomStatus.ts    # Room status transition logic
  routes/
    (auth)/            # Login page (no role required)
    (manager)/         # Manager-only routes + layout
    (reception)/       # Reception routes + layout
    (housekeeping)/    # Housekeeping routes + layout
    api/
      rooms/           # +server.ts REST endpoints
      bookings/
      sync/            # Offline queue sync endpoint
  app.html
  hooks.server.ts      # Auth check + RBAC middleware — always here
tests/                 # Playwright e2e only
  rooms.spec.ts
  checkin.spec.ts
```

**Test placement:**
- Unit/integration tests: co-located `*.test.ts` next to source file — e.g., `formatVND.test.ts` beside `formatVND.ts`
- Playwright e2e: `/tests/*.spec.ts` root folder only

**Environment variables:**
- `PUBLIC_` prefix: client-safe only — `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`
- No `PUBLIC_` prefix: server-only secrets — `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`
- `.env.example` committed with all keys present, values empty

---

### Format Patterns

**API Response Envelope (all `+server.ts` endpoints):**
```typescript
// Success
{ data: T, error: null }

// Error
{ data: null, error: { message: string, code: string } }
```

**HTTP Status Codes:**
- `200` — success with data
- `201` — resource created
- `400` — validation error (bad client input)
- `401` — not authenticated
- `403` — authenticated but wrong role
- `404` — resource not found
- `409` — conflict (e.g., room already occupied)
- `500` — unexpected server error (never expose raw DB errors)

**Date/time in JSON:** ISO 8601 strings — `"2026-02-15T14:30:00Z"`. Never timestamps or formatted strings in API layer.

**Date display:** Always `Intl.DateTimeFormat('vi-VN')` → renders as `15/02/2026`. Never hardcode format strings.

**Currency in JSON:** Integer VND — `1500000`. Never floats, never strings.

**Currency display:** Always `new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount)` → renders as `1.500.000 ₫`.

**JSON field naming:** `snake_case` throughout — matches Supabase/Postgres output. No camelCase conversion layer.

---

### Communication Patterns

**Supabase Realtime Channel Naming:**
- `rooms:all` — full room diagram state broadcast (all connected sessions)
- `room:{roomId}` — per-room targeted updates
- `notifications:{staffId}` — targeted push to specific staff member

**Svelte 5 Runes vs Stores boundary:**
- `$state`, `$derived`, `$effect` — component-local only, never passed across component boundaries
- Svelte Stores (`writable`, `readable`) — any state shared across components, pages, or routes
- Real-time room data lives in `roomStateStore` (store) — subscribed to in `+layout.svelte`, consumed anywhere

**Form Action naming:**
- Primary action: `?/default` or named `?/submit`
- Specific actions: `?/checkIn`, `?/checkOut`, `?/markReady`, `?/logAttendance`, `?/stockIn`, `?/stockOut`
- Always `camelCase` for action names

---

### Process Patterns

**Error Handling:**
- `+server.ts`: wrap all handlers in `try/catch`; return `{ data: null, error: { message, code } }`
- `+page.server.ts` load functions: use SvelteKit `error(status, message)` helper
- Client `.svelte`: display `error.message` to user; `console.error(error.code)` for debugging
- Never expose raw Postgres error strings to client

**Loading States:**
- Superforms provides `$form.submitting` for form operations — use this, never roll custom
- Page-level: SvelteKit navigation state via `$navigating` store
- Manual async ops: `let isLoading = $state(false)` with `isLoading` naming pattern
- Pattern: `is{Action}ing` — `isCheckingIn`, `isSavingAttendance`, `isLoadingRooms`

**RBAC check placement:**
```typescript
// hooks.server.ts — global auth gate
if (!event.locals.session) throw redirect(303, '/login');

// +page.server.ts — role gate for specific pages
if (session.user.role !== 'manager') throw error(403, 'Forbidden');
```
**Rule:** RBAC checks live ONLY in `hooks.server.ts` or `+page.server.ts`. Never in `.svelte` components (display-only there).

**Offline Queue Item Structure:**
```typescript
interface QueueItem {
  id: string;           // UUID
  action: string;       // e.g., 'updateRoomStatus', 'logAttendance'
  payload: object;      // Action-specific data
  timestamp: string;    // ISO 8601 — used for conflict resolution
  retries: number;      // Max 3 before surfacing error to user
}
```

---

### Enforcement Guidelines

**All AI Agents MUST:**
1. Use `snake_case` for all DB tables, columns, and JSON API fields
2. Place ALL auth/RBAC checks in `hooks.server.ts` or `+page.server.ts` — never in `.svelte` components
3. Return `{ data, error }` envelope from every `+server.ts` REST endpoint
4. Never hand-edit `src/lib/db/types.ts` — regenerate via `supabase gen types typescript` only
5. Use Svelte Stores for any state shared across component boundaries — never use `$state` for cross-component data
6. Format dates for display with `Intl.DateTimeFormat('vi-VN')` — never hardcode date format strings
7. Store currency as integer VND in DB/API; format for display with `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })`
8. Co-locate unit tests as `*.test.ts` beside source file; Playwright e2e tests go in `/tests` root only
9. Never prefix server-only secrets with `PUBLIC_` in environment variables
10. Import server-only code (`src/lib/server/`) only from `+page.server.ts`, `+server.ts`, or `hooks.server.ts` — never from `.svelte` files

---

## Project Structure & Boundaries

### Requirements to Structure Mapping

| FR Category | Routes | Components | Server/DB | Stores |
|---|---|---|---|---|
| Auth (FR1–5) | `(auth)/login` | `layout/` | `server/auth.ts` + `hooks.server.ts` | `session.ts` |
| Room Management (FR6–16) | `(reception)/rooms/`, `(housekeeping)/rooms/` | `rooms/` | `server/db/rooms.ts` | `roomState.ts` |
| Booking Management (FR17–24) | `(reception)/bookings/` | `bookings/` | `server/db/bookings.ts` | — |
| Guest Management (FR25–28) | (embedded in bookings) | `bookings/GuestInput.svelte` | `server/db/bookings.ts` | — |
| Attendance (FR29–33) | `(reception)/attendance/` | `attendance/` | `server/db/attendance.ts` | — |
| Inventory (FR34–41) | `(reception)/inventory/` | `inventory/` | `server/db/inventory.ts` | — |
| Dashboard / Reports (FR42–46) | `(manager)/dashboard/`, `(manager)/reports/` | `reports/` | `server/db/reports.ts` | — |
| Notifications (FR47–49) | (overlay, no dedicated route) | `layout/NotificationToast.svelte` | `server/notifications.ts` | `notifications.ts` |
| Offline / PWA (FR50–54) | (Service Worker + manifest) | — | `api/sync/+server.ts` | — |

### Complete Project Directory Structure

```
manage-smeraldo-hotel/
├── .env.example
├── .gitignore
├── .eslintrc.cjs
├── .prettierrc
├── package.json
├── svelte.config.js              # adapter-node configured here
├── vite.config.ts                # @vite-pwa/sveltekit plugin
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.cjs
├── playwright.config.ts
│
├── .github/
│   └── workflows/
│       └── deploy.yml            # lint → typecheck → test → build → PM2 reload
│
├── supabase/
│   ├── config.toml               # Supabase CLI config
│   └── migrations/
│       ├── 00001_initial_schema.sql
│       ├── 00002_rls_policies.sql
│       ├── 00003_audit_trail.sql
│       └── 00004_seed_rooms.sql
│
├── static/
│   ├── favicon.png
│   ├── icons/                    # PWA icons (192x192, 512x512)
│   └── manifest.webmanifest
│
├── tests/                        # Playwright e2e only
│   ├── fixtures/
│   │   └── auth.ts
│   ├── checkin.spec.ts
│   ├── room-status.spec.ts
│   ├── attendance.spec.ts
│   └── inventory.spec.ts
│
└── src/
    ├── app.html
    ├── app.css
    ├── hooks.server.ts           # Auth session + RBAC gate (all requests)
    │
    ├── lib/
    │   ├── components/
    │   │   ├── ui/               # shadcn-svelte primitives
    │   │   │   ├── Button.svelte
    │   │   │   ├── Dialog.svelte
    │   │   │   ├── Badge.svelte
    │   │   │   ├── Input.svelte
    │   │   │   ├── Select.svelte
    │   │   │   └── Table.svelte
    │   │   ├── layout/
    │   │   │   ├── Sidebar.svelte
    │   │   │   ├── BottomNav.svelte        # Mobile (housekeeping)
    │   │   │   ├── PageHeader.svelte
    │   │   │   └── NotificationToast.svelte
    │   │   ├── rooms/
    │   │   │   ├── RoomDiagram.svelte      # FR6 — full 23-room grid
    │   │   │   ├── RoomCard.svelte         # FR7, FR8
    │   │   │   ├── FloorFilter.svelte      # FR9
    │   │   │   ├── CalendarView.svelte     # FR10
    │   │   │   └── StatusBadge.svelte      # NFR-A2 — color + text
    │   │   ├── bookings/
    │   │   │   ├── BookingForm.svelte      # FR17, FR21
    │   │   │   ├── BookingRow.svelte
    │   │   │   ├── GuestInput.svelte       # FR25–FR27
    │   │   │   ├── CheckInButton.svelte    # FR18
    │   │   │   └── CheckOutButton.svelte   # FR19
    │   │   ├── attendance/
    │   │   │   ├── AttendanceTable.svelte  # FR32
    │   │   │   ├── ShiftInput.svelte       # FR29 — 0/0.5/1/1.5
    │   │   │   └── MonthPicker.svelte
    │   │   ├── inventory/
    │   │   │   ├── InventoryList.svelte    # FR34
    │   │   │   ├── StockInForm.svelte      # FR35
    │   │   │   ├── StockOutForm.svelte     # FR36
    │   │   │   └── LowStockAlert.svelte    # FR38, FR47
    │   │   └── reports/
    │   │       ├── OccupancyWidget.svelte  # FR42, FR44
    │   │       ├── AttendanceSummary.svelte# FR45
    │   │       └── InventorySummary.svelte # FR46
    │   │
    │   ├── server/               # Server-only — never imported in .svelte files
    │   │   ├── auth.ts           # getSession(), requireRole(), hasRole()
    │   │   ├── notifications.ts  # Push notification dispatch
    │   │   └── db/
    │   │       ├── rooms.ts      # getRooms(), updateRoomStatus(), getRoomById()
    │   │       ├── bookings.ts   # createBooking(), checkIn(), checkOut()
    │   │       ├── attendance.ts # logAttendance(), getMonthlyAttendance()
    │   │       ├── inventory.ts  # getStock(), stockIn(), stockOut()
    │   │       └── reports.ts    # getOccupancyReport(), getAttendanceReport()
    │   │
    │   ├── db/
    │   │   ├── types.ts          # Supabase CLI generated — DO NOT EDIT
    │   │   └── schema.ts         # Zod schemas
    │   │
    │   ├── stores/
    │   │   ├── session.ts        # Current user + role
    │   │   ├── roomState.ts      # Live room map from Supabase Realtime
    │   │   └── notifications.ts  # Push notification queue
    │   │
    │   └── utils/
    │       ├── formatVND.ts
    │       ├── formatVND.test.ts
    │       ├── parseDate.ts
    │       ├── parseDate.test.ts
    │       ├── roomStatus.ts     # Status transition logic
    │       ├── roomStatus.test.ts
    │       └── offlineQueue.ts   # IndexedDB queue (FR52)
    │
    └── routes/
        ├── +layout.server.ts     # Load session (all routes)
        ├── +layout.svelte        # Root layout + Realtime subscription init
        │
        ├── (auth)/
        │   └── login/
        │       ├── +page.svelte
        │       └── +page.server.ts
        │
        ├── (manager)/
        │   ├── +layout.svelte
        │   ├── +layout.server.ts # requireRole('manager')
        │   ├── dashboard/
        │   │   ├── +page.svelte  # FR42, FR43
        │   │   └── +page.server.ts
        │   └── reports/
        │       ├── +page.svelte  # FR44, FR45, FR46
        │       └── +page.server.ts
        │
        ├── (reception)/
        │   ├── +layout.svelte
        │   ├── +layout.server.ts # requireRole('reception' | 'manager')
        │   ├── rooms/
        │   │   ├── +page.svelte
        │   │   └── +page.server.ts  # ?/checkIn, ?/checkOut, ?/overrideStatus
        │   ├── bookings/
        │   │   ├── +page.svelte
        │   │   ├── +page.server.ts
        │   │   ├── new/
        │   │   │   ├── +page.svelte
        │   │   │   └── +page.server.ts
        │   │   └── [bookingId]/
        │   │       ├── +page.svelte
        │   │       └── +page.server.ts
        │   ├── attendance/
        │   │   ├── +page.svelte
        │   │   └── +page.server.ts  # ?/logAttendance
        │   └── inventory/
        │       ├── +page.svelte
        │       └── +page.server.ts  # ?/stockIn, ?/stockOut
        │
        ├── (housekeeping)/
        │   ├── +layout.svelte        # Bottom nav (mobile-first)
        │   ├── +layout.server.ts     # requireRole('housekeeping' | 'manager')
        │   └── rooms/
        │       ├── +page.svelte      # FR13 — assigned rooms
        │       └── +page.server.ts   # ?/markReady (FR14)
        │
        └── api/
            ├── rooms/
            │   └── [roomId]/
            │       └── status/
            │           └── +server.ts    # PATCH — Realtime trigger
            ├── notifications/
            │   └── +server.ts            # Web Push dispatch (FR49)
            └── sync/
                └── +server.ts            # POST — offline queue flush (FR52)
```

### Architectural Boundaries

**Auth boundary:** `hooks.server.ts` gates every request. Role-specific gates in each `(group)/+layout.server.ts`. No authenticated route is reachable without a valid session.

**Server/client boundary:** `src/lib/server/` is compile-time enforced by SvelteKit — build fails if `.svelte` files import from it. All DB access goes through `src/lib/server/db/*.ts`.

**Real-time boundary:** Root `+layout.svelte` initialises the Supabase Realtime subscription once. All consumers read from `roomStateStore` — never make direct Realtime calls inside components.

**Offline boundary:** Service Worker (Workbox) intercepts writes when offline → `offlineQueue.ts` (IndexedDB) persists them → `api/sync/+server.ts` flushes the queue on reconnect.

### Data Flow

```
User action
  → Form Action (?/checkIn) or REST endpoint (PATCH /api/rooms/[id]/status)
  → src/lib/server/db/rooms.ts (Supabase query)
  → Postgres UPDATE
  → Supabase Realtime broadcast (rooms:all channel)
  → roomStateStore update (all connected clients)
  → RoomDiagram.svelte re-renders (reactive to store)
```

### External Integrations

- **Supabase self-hosted stack** — Postgres, Auth, Realtime, Storage (Docker Compose on VPS)
- **Web Push API** — browser push notifications via VAPID keys (no third-party push service)
- **Let's Encrypt / Certbot** — automated TLS via Nginx
- **GitHub Actions** — CI/CD pipeline triggering SSH deploy to VPS

---

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices are mutually compatible. SvelteKit 2.x/Svelte 5 + TypeScript, `adapter-node` + PM2, Supabase Realtime WebSocket, `@supabase/ssr` + `hooks.server.ts`, `@vite-pwa/sveltekit` (Workbox), and Zod + Superforms + Form Actions all interoperate without conflicts.

**Correction applied:** shadcn-svelte's current stable release targets Tailwind v3. Tailwind v4 support is maturing but not stable in the shadcn-svelte ecosystem. **Pin to Tailwind v3** in `package.json`. Upgrade to v4 post-MVP when ecosystem stabilises.

**Pattern Consistency:**
Naming conventions (snake_case DB / PascalCase components / camelCase utils), RBAC placement, and state management split (Runes for local / Stores for shared) are internally consistent and aligned with SvelteKit idioms.

**Structure Alignment:**
Route groups `(manager)`, `(reception)`, `(housekeeping)` directly mirror the 3-role access model. Server-only boundary is compile-time enforced. Realtime state flows through `roomStateStore` only — no direct component subscriptions.

### Requirements Coverage Validation ✅

**Functional Requirements — all 54 FRs covered:**

| FR Group | Coverage |
|---|---|
| Auth FR1–5 | Supabase Auth + `hooks.server.ts` + `(auth)/login` |
| Room Management FR6–16 | `RoomDiagram.svelte`, `FloorFilter`, `CalendarView`, `StatusBadge`, Realtime, audit trail table |
| Booking FR17–24 | `(reception)/bookings/` routes + `BookingForm`, long-stay date range support |
| Guest FR25–28 | `GuestInput.svelte` embedded in booking flow |
| Attendance FR29–33 | `ShiftInput` (0/0.5/1/1.5), `AttendanceTable`, `?/logAttendance` |
| Inventory FR34–41 | `StockInForm`, `StockOutForm`, `LowStockAlert`, manager threshold config |
| Reports FR42–46 | `(manager)/dashboard` + `(manager)/reports`, `OccupancyWidget`, `AttendanceSummary`, `InventorySummary` |
| Notifications FR47–49 | Web Push API via `api/notifications/+server.ts`, `NotificationToast.svelte` |
| Offline/PWA FR50–54 | `@vite-pwa/sveltekit` manifest + SW, `offlineQueue.ts` (IndexedDB), `api/sync/+server.ts` |

**Non-Functional Requirements — all 16 NFRs covered:**

| NFR | Covered By |
|---|---|
| NFR-P1 < 3s initial | Vite optimised build + Nginx static serving |
| NFR-P2 < 1s cached | Workbox Service Worker cache |
| NFR-P3 room diagram < 1s | 23 rooms, no pagination, client-side render |
| NFR-P4 < 500ms navigation | SPA routing (no full reload) |
| NFR-P5 < 3s realtime | Supabase Realtime WebSocket |
| NFR-S1 HTTPS only | Nginx + Certbot / Let's Encrypt |
| NFR-S2 8h session expiry | Supabase Auth session config |
| NFR-S3 server-side RBAC | `hooks.server.ts` + Supabase RLS hybrid |
| NFR-S4 audit trail | Immutable Postgres table, insert-only RLS policy |
| NFR-S5 housekeeping restriction | RLS policies + RBAC role matrix |
| NFR-R1 99%+ uptime | PM2 auto-restart + Nginx |
| NFR-R2 no offline data loss | IndexedDB queue + background sync |
| NFR-R3 RPO ≤ 24h | Daily `supabase db dump` cron |
| NFR-R4 concurrent updates | Postgres transactions + server-side conflict resolution |
| NFR-A1/A2 WCAG + labels | Tailwind color tokens + `StatusBadge.svelte` (color + text) |
| NFR-I1/I2 Web Push + SW spec | Native Web Push API (VAPID), Workbox W3C compliant |

### Gap Analysis Results

**Critical gaps:** None.

**Minor gaps resolved:**
1. **Tailwind v3 pin** — use v3 for shadcn-svelte compatibility; documented in starter command
2. **Realtime cleanup pattern** — call `channel.unsubscribe()` in `onDestroy` in root `+layout.svelte`
3. **VAPID keys** — Web Push requires a VAPID key pair generated at VPS setup; document in deployment runbook

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed (54 FRs, 16 NFRs)
- [x] Scale and complexity assessed (medium — 5 users, 23 rooms)
- [x] Technical constraints identified (PWA, real-time, vi-VN locale, VPS self-hosted)
- [x] 6 cross-cutting concerns mapped

**✅ Architectural Decisions**
- [x] Critical decisions documented with rationale
- [x] Full technology stack specified
- [x] Integration patterns defined (Realtime, PWA, offline sync, RBAC)
- [x] All NFRs architecturally addressed

**✅ Implementation Patterns**
- [x] Naming conventions (DB, API, code)
- [x] Structure patterns (project tree, test placement, env vars)
- [x] Communication patterns (Realtime channels, Stores vs Runes, Form Actions)
- [x] Process patterns (error handling, loading states, RBAC, offline queue)
- [x] 10 mandatory enforcement rules for AI agents

**✅ Project Structure**
- [x] Complete directory tree with all files defined
- [x] All 54 FRs mapped to specific files/directories
- [x] All architectural boundaries documented
- [x] End-to-end data flow documented

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence Level: High**

**Key Strengths:**
- Supabase self-hosted covers auth + realtime + DB + push in one stack — minimal moving parts
- SvelteKit server/client boundary is compile-time enforced — RBAC leaks are impossible at build time
- Route group structure perfectly mirrors the 3-role access model
- Offline queue + background sync pattern is defined end-to-end
- All 54 FRs have a specific home in the project tree

**Areas for Future Enhancement (Post-MVP):**
- Upgrade shadcn-svelte + Tailwind v4 once ecosystem stabilises
- Add Sentry error tracking as user base grows
- Containerise full stack (SvelteKit + Supabase) via Docker Compose for consistent deployments
- OpenAPI docs for REST endpoints when OTA API integration begins (Phase 3)

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently — refer to the Enforcement Guidelines (10 rules)
- Respect project structure and server/client boundaries
- Refer to this document for all architectural questions before making independent decisions

**First Implementation Priority:**
```bash
npm create svelte@latest manage-smeraldo-hotel
# Options: Minimal app, TypeScript, ESLint, Prettier, Vitest, Playwright
cd manage-smeraldo-hotel
npm install @sveltejs/adapter-node
npm install @supabase/supabase-js @supabase/ssr
npm install -D @vite-pwa/sveltekit
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
```

---

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** COMPLETED ✅
**Total Steps Completed:** 8
**Date Completed:** 2026-02-15
**Document Location:** `_bmad-output/planning-artifacts/architecture.md`

### Final Architecture Deliverables

**Complete Architecture Document**
- All architectural decisions documented with rationale
- Implementation patterns ensuring AI agent consistency (10 mandatory rules)
- Complete project structure with all files and directories
- All 54 FRs and 16 NFRs mapped to architectural components
- Validation confirming coherence and completeness

**Implementation Ready Foundation**
- ~25 architectural decisions made across 5 categories
- 8 implementation pattern categories defined
- 9 feature modules + 4 infrastructure layers specified
- 54 functional requirements fully supported

**AI Agent Implementation Guide**
- Technology stack: SvelteKit 2.x/Svelte 5 + TypeScript + Supabase self-hosted + Tailwind v3 + shadcn-svelte + adapter-node + PM2 + Nginx
- 10 consistency rules that prevent implementation conflicts
- Complete project tree with every file named and explained
- End-to-end data flow documented

### Development Sequence

1. VPS provisioning + Nginx + Certbot + Supabase Docker stack setup
2. Initialize project using starter template command (above)
3. Supabase schema + RLS policies + migrations baseline
4. Auth / session / RBAC middleware (`hooks.server.ts`)
5. Core feature modules: Room → Booking → Attendance → Inventory
6. Supabase Realtime channel subscriptions
7. PWA Service Worker + offline queue (`offlineQueue.ts`)
8. CI/CD pipeline (GitHub Actions → SSH → PM2 reload)

### Quality Assurance Checklist

**✅ Architecture Coherence**
- [x] All decisions work together without conflicts
- [x] Technology choices are compatible (Tailwind v3 correction applied)
- [x] Patterns support the architectural decisions
- [x] Structure aligns with all choices

**✅ Requirements Coverage**
- [x] All 54 functional requirements are architecturally supported
- [x] All 16 non-functional requirements are addressed
- [x] 6 cross-cutting concerns are handled
- [x] All integration points are defined

**✅ Implementation Readiness**
- [x] Decisions are specific and actionable
- [x] Patterns prevent AI agent conflicts
- [x] Project structure is complete and unambiguous
- [x] Data flow is documented end-to-end

---

**Architecture Status: READY FOR IMPLEMENTATION ✅**

**Document Maintenance:** Update this architecture when major technical decisions are made during implementation.
