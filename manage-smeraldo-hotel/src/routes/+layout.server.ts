// Root layout server — loads session for all routes
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	const { session, user } = await locals.safeGetSession();

	return {
		session,
		user,
		userRole: locals.userRole,
		cookies: cookies.getAll()
	};
};
