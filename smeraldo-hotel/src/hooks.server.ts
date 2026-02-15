import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { createServerClient } from '@supabase/ssr';
import { redirect, type Handle } from '@sveltejs/kit';

/** Routes that don't require authentication */
const PUBLIC_ROUTES = ['/login', '/auth'];

function isPublicRoute(pathname: string): boolean {
	return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'));
}

function isStaticAsset(pathname: string): boolean {
	return (
		pathname.startsWith('/_app/') ||
		pathname.startsWith('/icons/') ||
		pathname === '/favicon.png' ||
		pathname === '/robots.txt' ||
		pathname.endsWith('.webmanifest')
	);
}

export const handle: Handle = async ({ event, resolve }) => {
	// Create Supabase server client with cookie-based session handling
	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					event.cookies.set(name, value, { ...options, path: '/' });
				});
			}
		}
	});

	/**
	 * Safe session getter — validates JWT via auth.getUser() first.
	 * NEVER trust auth.getSession() alone on the server.
	 */
	event.locals.safeGetSession = async () => {
		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();

		if (error || !user) {
			return { session: null, user: null };
		}

		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();

		return { session, user };
	};

	// Skip auth check for static assets
	if (isStaticAsset(event.url.pathname)) {
		return resolve(event);
	}

	// Auth gate — redirect unauthenticated users to /login
	if (!isPublicRoute(event.url.pathname)) {
		const { session } = await event.locals.safeGetSession();

		if (!session) {
			redirect(303, '/login');
		}
	}

	return resolve(event, {
		filterSerializedResponseHeaders(name: string) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
