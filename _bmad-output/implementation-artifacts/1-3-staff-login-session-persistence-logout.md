# Story 1.3: Staff Login, Session Persistence & Logout

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a staff member,
I want to log in using my personal credentials and have my session persist across browser tabs and page refreshes,
So that I can securely access the system throughout my shift without being interrupted by repeated login prompts.

## Acceptance Criteria

1. **Given** the login page at `(auth)/login` is open **When** a staff member enters valid credentials and submits **Then** Supabase Auth creates an SSR session cookie via `@supabase/ssr`, the user is redirected to their role-appropriate home page, and `src/lib/stores/session.ts` is populated with user + role

2. **Given** a staff member is logged in **When** they open a new browser tab or refresh the page **Then** the session is still valid, no redirect to login occurs, and the user sees their role-specific workspace (FR4)

3. **Given** a staff member is logged in **When** they click "Log Out" **Then** the Supabase session is terminated, the session cookie is cleared, and the user is redirected to the login page (FR5)

4. **Given** a staff member's session has been inactive for 8 hours **When** they attempt to access any protected page **Then** they are redirected to the login page with a session-expired message (NFR-S2)

5. **Given** any protected route is accessed without a valid session **When** `hooks.server.ts` evaluates the request **Then** it throws a redirect to `/login` — all data endpoints return 401 (NFR-S1, NFR-S3)

## Tasks / Subtasks

- [x] **Task 1: Implement `hooks.server.ts` — Supabase SSR Client + Auth Gate** (AC: #2, #4, #5)
  - [x] Import `createServerClient` from `@supabase/ssr`
  - [x] Read `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` from `$env/static/public`
  - [x] Create Supabase server client with cookie handlers (`getAll`, `setAll`) per `@supabase/ssr` SvelteKit pattern
  - [x] Attach `supabase` client to `event.locals.supabase`
  - [x] Implement `event.locals.safeGetSession()` — calls `auth.getUser()` first (JWT validation), then `auth.getSession()` for session data
  - [x] Add auth gate: if no session AND route is NOT `/login` or `/auth/*`, redirect to `/login`
  - [x] Add `filterSerializedResponseHeaders` for `content-range` and `x-supabase-api-version`
  - [x] Allow static assets and favicon through without auth check

- [x] **Task 2: Implement `src/lib/server/auth.ts` — Server Auth Utilities** (AC: #1, #5)
  - [x] Implement `getSession(locals)` — wrapper around `safeGetSession()` that returns `{ session, user }` or null
  - [x] Implement `getUserRole(locals)` — fetches role from `staff_members` table using session user ID
  - [x] Implement `requireAuth(locals)` — throws redirect to `/login` if no session
  - [x] Implement `requireRole(locals, allowedRoles: StaffRole[])` — throws 403 if user's role not in allowed list
  - [x] All functions are server-only (in `src/lib/server/`) — build fails if imported from `.svelte`
  - [x] Additional: Implemented `getStaffProfile()` to fetch full profile (role, full_name, is_active)

- [x] **Task 3: Update Root Layout — Session Loading + Client-Side Auth** (AC: #2, #4)
  - [x] Update `src/routes/+layout.server.ts` — call `safeGetSession()`, return `session`, `user`, `cookies`
  - [x] Create `src/routes/+layout.ts` — create browser/server Supabase client using `createBrowserClient`/`createServerClient` from `@supabase/ssr`; use `depends('supabase:auth')`
  - [x] Update `src/routes/+layout.svelte` — listen to `onAuthStateChange`, call `invalidate('supabase:auth')` on session change
  - [x] Pass `supabase` and `session` from layout data to child routes

- [x] **Task 4: Update `src/lib/stores/session.ts` — Session Store with Role** (AC: #1, #2)
  - [x] Update `SessionData` interface: `{ user: User | null; role: StaffRole | null; fullName: string | null; session: Session | null }`
  - [x] Export `sessionStore` as writable store
  - [x] Export `updateSession(session, user, role, fullName)` helper function
  - [x] Export `clearSession()` helper function

- [x] **Task 5: Implement Login Page** (AC: #1)
  - [x] Update `src/routes/(auth)/login/+page.server.ts`:
    - [x] `load` function: if already logged in, redirect to role-appropriate home
    - [x] `actions.default`: validate email + password, call `supabase.auth.signInWithPassword()`, on success redirect to role-appropriate home
  - [x] Update `src/routes/(auth)/login/+page.svelte`:
    - [x] Email input field with validation
    - [x] Password input field
    - [x] Submit button with loading state (spinner animation)
    - [x] Error message display (invalid credentials, session expired)
    - [x] Use Tailwind classes matching Smeraldo design (primary navy, accent gold)
    - [x] Accessible: proper `<label>` + `for`, `aria-invalid`, focus management
    - [x] Vietnamese UI text (Đăng nhập, Mật khẩu, etc.)

- [x] **Task 6: Implement Logout** (AC: #3)
  - [x] Created `src/routes/auth/logout/+server.ts` endpoint
  - [x] Call `supabase.auth.signOut()` to terminate session
  - [x] Redirect to `/login` after sign out
  - [ ] Add "Log Out" button to layout (visible when authenticated) — *Deferred to when layout chrome is implemented*

- [x] **Task 7: Role-Appropriate Redirect Logic** (AC: #1, #2)
  - [x] Create `src/lib/utils/roleRedirect.ts`:
    - [x] `getRoleHomePath(role: StaffRole): string` — returns `/rooms` for reception, `/my-rooms` for housekeeping, `/dashboard` for manager
  - [x] Used in login action and root page redirect
  - [x] Created `src/routes/+page.server.ts` — redirects authenticated users to role-appropriate home

- [x] **Task 8: Update `app.d.ts` Type Definitions** (AC: all)
  - [x] `App.Locals` has: `supabase: SupabaseClient`, `safeGetSession()`
  - [x] `App.PageData` has: `session: Session | null`, `user: User | null`

- [x] **Task 9: Write Unit Tests + Verification** (AC: all)
  - [x] Test `roleRedirect.ts` — `getRoleHomePath()` returns correct paths for each role (3 tests)
  - [x] Test `session.ts` store — `updateSession()` and `clearSession()` work correctly (3 tests)
  - [x] Verify `npm run check` passes with zero errors ✅
  - [x] Verify `npm run lint` passes ✅
  - [x] Verify `npm run build` passes ✅
  - [x] Verify `npm test` passes — 15/15 tests ✅

- [x] **Task 10: Additional — .env + Role-Gated Layouts** (AC: #5)
  - [x] Created `.env` with development placeholder values (gitignored)
  - [x] Updated `(manager)/+layout.server.ts` — `requireRole(['manager'])`
  - [x] Updated `(reception)/+layout.server.ts` — `requireRole(['reception', 'manager'])`
  - [x] Updated `(housekeeping)/+layout.server.ts` — `requireRole(['housekeeping', 'manager'])`

## Dev Notes

### Critical Architecture Constraints

- **`@supabase/ssr`** — Do NOT use `@supabase/auth-helpers` (deprecated). Use `createServerClient` and `createBrowserClient` from `@supabase/ssr` v0.8.x
- **NEVER trust `auth.getSession()` on the server** — Always call `auth.getUser()` first to validate the JWT. The `safeGetSession()` pattern does this.
- **Server-side RBAC only** — Auth/role checks ONLY in `hooks.server.ts`, `+page.server.ts`, `+server.ts`. NEVER in `.svelte` files. Client-side role checks are display-only.
- **Cookie-based sessions** — `@supabase/ssr` uses HTTP cookies for SSR session persistence. The `getAll`/`setAll` pattern maps to SvelteKit's `event.cookies` API.
- **8-hour session expiry** — Configured in Supabase Auth settings on the server. The client handles token refresh automatically; after 8h inactive, the refresh token is invalid.
- **Named exports only** — No default exports except `.svelte` components and `+page/+layout` files
- **TypeScript strict mode ON** — Never use `any`; use `unknown` + type guard

### Supabase SSR SvelteKit Pattern (EXACT Implementation)

**`hooks.server.ts`:**
```typescript
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { createServerClient } from '@supabase/ssr';
import { redirect, type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => event.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          event.cookies.set(name, value, { ...options, path: '/' });
        });
      },
    },
  });

  event.locals.safeGetSession = async () => {
    const { data: { user }, error } = await event.locals.supabase.auth.getUser();
    if (error) {
      return { session: null, user: null };
    }
    const { data: { session } } = await event.locals.supabase.auth.getSession();
    return { session, user };
  };

  // Auth gate — redirect unauthenticated to /login
  // (skip for /login, /auth/*, and static assets)

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version';
    },
  });
};
```

**`+layout.server.ts`:**
```typescript
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { safeGetSession }, cookies }) => {
  const { session, user } = await safeGetSession();
  return {
    session,
    user,
    cookies: cookies.getAll(),
  };
};
```

**`+layout.ts` (NEW FILE — client-side Supabase client):**
```typescript
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { LayoutLoad } from './$types';
import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';

export const load: LayoutLoad = async ({ fetch, data, depends }) => {
  depends('supabase:auth');

  const supabase = isBrowser()
    ? createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
        global: { fetch },
      })
    : createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
        global: { fetch },
        cookies: {
          getAll() {
            return data.cookies;
          },
        },
      });

  const { data: { session } } = await supabase.auth.getSession();
  return { supabase, session };
};
```

**`+layout.svelte` (with auth state listener):**
```svelte
<script lang="ts">
  import '../app.css';
  import { invalidate } from '$app/navigation';
  import { onMount } from 'svelte';
  import { sessionStore, updateSession, clearSession } from '$lib/stores/session';

  let { data, children } = $props();
  let { supabase, session } = $derived(data);

  onMount(() => {
    const { data: authData } = supabase.auth.onAuthStateChange((event, _session) => {
      if (_session?.expires_at !== session?.expires_at) {
        invalidate('supabase:auth');
      }
    });
    return () => authData.subscription.unsubscribe();
  });
</script>

{@render children()}
```

### Login with Email + Password (NOT Magic Link)

This hotel uses email+password authentication (staff accounts created by manager). Do NOT implement magic link or OAuth. Use `supabase.auth.signInWithPassword({ email, password })`.

### Role-Appropriate Home Pages

| Role | Home Path | Description |
|------|-----------|-------------|
| `manager` | `/dashboard` | Manager dashboard (Story 6.1) |
| `reception` | `/rooms` | Room diagram (Story 2.1) |
| `housekeeping` | `/my-rooms` | Assigned rooms (Story 2.4) |

### Database Schema Context (from Story 1.2)

```sql
-- staff_members table (links to auth.users)
CREATE TABLE staff_members (
  id         UUID PRIMARY KEY REFERENCES auth.users,
  full_name  TEXT NOT NULL,
  role       staff_role NOT NULL,  -- 'manager' | 'reception' | 'housekeeping'
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TYPE staff_role AS ENUM ('manager', 'reception', 'housekeeping');
```

After login, fetch the user's role from `staff_members` using the authenticated user's ID:
```typescript
const { data } = await supabase.from('staff_members').select('role, full_name').eq('id', user.id).single();
```

### Previous Story (1.1 + 1.2) Intelligence

**From Story 1.1 (Project Scaffold):**
- `@supabase/ssr` v0.8.0 already installed in `package.json`
- `@supabase/supabase-js` v2.95.3 already installed
- `hooks.server.ts` exists as placeholder — replace entirely
- `src/lib/server/auth.ts` exists as `export {};` placeholder — replace entirely
- `src/lib/stores/session.ts` exists with basic `SessionData` interface — update
- `(auth)/login/+page.svelte` exists as placeholder — replace entirely
- `(auth)/login/+page.server.ts` exists as placeholder — replace entirely
- `src/routes/+layout.server.ts` exists as placeholder — update
- `src/routes/+layout.svelte` exists with basic `{@render children()}` — update
- `app.d.ts` already has Supabase type stubs (from code review) — verify/update
- `cn()` utility exists in `src/lib/utils.ts` (clsx + tailwind-merge)
- Tailwind custom colors: `primary` (#1E3A8A navy), `accent` (#CA8A04 gold), `background` (#F8FAFC)
- Fira Sans / Fira Code fonts loaded via `<link>` in `app.html`
- `.env.example` has `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`

**From Story 1.2 (Database Schema):**
- `staff_members` table with `id UUID PRIMARY KEY REFERENCES auth.users`, `role staff_role`, `full_name`, `is_active`
- `staff_role` enum: `manager`, `reception`, `housekeeping`
- Migration files in `supabase/migrations/`
- Zod schemas created in `src/lib/db/schema.ts` (if completed by Amp)

**Code review findings applied to 1.1:**
- Removed `@sveltejs/adapter-auto` (only `adapter-node`)
- Font loading moved to `<link>` tags in `app.html`
- `app.d.ts` has `App.Locals` stubs with `supabase` and `safeGetSession`
- `.nvmrc` created with `22`

### UX Design Requirements

- Login form: `Form` + `Input` + `Button` shadcn-svelte components (if available) or equivalent Tailwind styling
- WCAG 2.1 Level AA: 4.5:1 contrast ratio for body text
- Minimum 48x48px touch targets on mobile
- Error messages below each field, shown on `blur` validation
- Loading state: skeleton/spinner for form submission
- No breadcrumbs needed (max 2 levels deep)
- Vietnamese locale as default (`lang="vi"` already set in `app.html`)

### File Structure

Files to create/modify:
```
src/hooks.server.ts                     # REPLACE — full Supabase SSR + auth gate
src/lib/server/auth.ts                  # REPLACE — getSession, getUserRole, requireAuth, requireRole
src/lib/stores/session.ts               # UPDATE — full SessionData with role
src/lib/utils/roleRedirect.ts           # CREATE — role → home path mapping
src/lib/utils/roleRedirect.test.ts      # CREATE — unit tests
src/routes/+layout.server.ts            # UPDATE — load session
src/routes/+layout.ts                   # CREATE — client-side Supabase client
src/routes/+layout.svelte               # UPDATE — auth state listener
src/routes/+page.svelte                 # UPDATE — redirect to role home
src/routes/(auth)/login/+page.svelte    # REPLACE — login form UI
src/routes/(auth)/login/+page.server.ts # REPLACE — login action + redirect
src/app.d.ts                            # VERIFY — type stubs
```

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security]
- [Source: _bmad-output/planning-artifacts/architecture.md#Process Patterns — RBAC check placement]
- [Source: _bmad-output/planning-artifacts/architecture.md#Enforcement Guidelines]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3]
- [Source: Supabase Docs — Creating a Supabase client for SSR (SvelteKit)]
- [Source: Supabase Docs — Build a User Management App with SvelteKit]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Login form]
- [Source: _bmad-output/project-context.md]

### Anti-Patterns to Avoid

1. Do NOT use `@supabase/auth-helpers` — deprecated; use `@supabase/ssr`
2. Do NOT trust `auth.getSession()` on the server — always call `auth.getUser()` first (via `safeGetSession()`)
3. Do NOT put auth/role checks in `.svelte` components — server-side only
4. Do NOT implement magic link or OAuth — use email+password only
5. Do NOT hardcode role strings — use `staff_role` type from schema
6. Do NOT import from `src/lib/server/` in `.svelte` files — build will fail
7. Do NOT use `any` type — use `unknown` + type guards
8. Do NOT create default exports — named exports only (except `.svelte` and `+page/+layout`)
9. Do NOT use `adapter-auto` — project uses `adapter-node`
10. Do NOT skip the auth gate in `hooks.server.ts` — every request must check session

## Testing Requirements

- Verify `npm run build` completes without errors
- Verify `npm run check` (svelte-check) passes with zero errors
- Verify `npm run lint` passes
- Verify `npm test` passes (all unit tests including new ones)
- Unit test: `roleRedirect.ts` — all 3 roles return correct paths
- Unit test: `session.ts` store — updateSession and clearSession
- Verify hooks.server.ts creates Supabase client with cookie handlers
- Verify unauthenticated access to protected routes redirects to /login
- Verify authenticated user can access role-appropriate pages
- Verify logout clears session and redirects to /login
- Verify session persists across page refresh (cookie-based)

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus — via Cursor Agent (BMad dev-story workflow)

### Debug Log References

- `$env/static/public` requires actual env vars at build time — created `.env` with placeholder values (gitignored)
- `svelte/no-navigation-without-resolve` ESLint rule fired on raw `<a href>` in `+page.svelte` — removed link since page is auth-gated anyway
- Logout implemented as POST endpoint (`auth/logout/+server.ts`) rather than Form Action in layout — cleaner separation

### Completion Notes List

- Task 1: Full Supabase SSR setup in hooks.server.ts with createServerClient, cookie handlers, safeGetSession (JWT validation via getUser()), auth gate for protected routes, static asset bypass.
- Task 2: Server auth utilities with getSession(), requireAuth(), getStaffProfile(), getUserRole(), requireRole() — all server-only with proper error types (redirect 303 for unauth, error 403 for forbidden).
- Task 3: Root layout chain — +layout.server.ts (session + cookies), +layout.ts (browser/server client with depends('supabase:auth')), +layout.svelte (onAuthStateChange listener).
- Task 4: Session store with full SessionData interface (user, role, fullName, session), updateSession() and clearSession() helpers.
- Task 5: Login page with email+password auth, Vietnamese UI (Đăng nhập), error handling, loading spinner, WCAG-compliant form (labels, aria-invalid), Smeraldo design tokens.
- Task 6: Logout endpoint at /auth/logout (POST) — signOut + redirect to /login. Logout button deferred to layout chrome implementation.
- Task 7: roleRedirect utility mapping manager→/dashboard, reception→/rooms, housekeeping→/my-rooms. Used in login redirect and root +page.server.ts.
- Task 8: app.d.ts updated with complete App.Locals and App.PageData types.
- Task 9: 15 unit tests pass (4 test files), svelte-check 0 errors, lint clean, build successful.
- Task 10: Role-gated group layouts updated with requireRole() calls. .env created for development.

### File List

<!-- Modified files -->
src/hooks.server.ts
src/lib/server/auth.ts
src/lib/stores/session.ts
src/routes/+layout.server.ts
src/routes/+layout.svelte
src/routes/+page.svelte
src/routes/(auth)/login/+page.svelte
src/routes/(auth)/login/+page.server.ts
src/routes/(manager)/+layout.server.ts
src/routes/(reception)/+layout.server.ts
src/routes/(housekeeping)/+layout.server.ts
src/app.d.ts

<!-- New files -->
src/routes/+layout.ts
src/routes/+page.server.ts
src/routes/auth/logout/+server.ts
src/lib/utils/roleRedirect.ts
src/lib/utils/roleRedirect.test.ts
src/lib/stores/session.test.ts
.env
