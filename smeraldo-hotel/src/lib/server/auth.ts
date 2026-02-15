// Server-only auth utilities — never import from .svelte components
import { redirect, error } from '@sveltejs/kit';
import type { Session, User } from '@supabase/supabase-js';

/** Staff roles matching the staff_role enum in the database */
export type StaffRole = 'manager' | 'reception' | 'housekeeping';

export interface AuthSession {
	session: Session;
	user: User;
}

export interface StaffProfile {
	role: StaffRole;
	full_name: string;
	is_active: boolean;
}

/**
 * Get the current authenticated session. Returns null if not authenticated.
 */
export async function getSession(
	locals: App.Locals
): Promise<{ session: Session; user: User } | null> {
	const { session, user } = await locals.safeGetSession();
	if (!session || !user) {
		return null;
	}
	return { session, user };
}

/**
 * Require authentication — redirects to /login if not authenticated.
 */
export async function requireAuth(locals: App.Locals): Promise<AuthSession> {
	const result = await getSession(locals);
	if (!result) {
		redirect(303, '/login');
	}
	return result;
}

/**
 * Fetch the staff member's role from the staff_members table.
 * Returns null if the user is not a staff member or is deactivated.
 */
export async function getStaffProfile(locals: App.Locals): Promise<StaffProfile | null> {
	const result = await getSession(locals);
	if (!result) {
		return null;
	}

	const { data, error: dbError } = await locals.supabase
		.from('staff_members')
		.select('role, full_name, is_active')
		.eq('id', result.user.id)
		.single();

	if (dbError || !data) {
		return null;
	}

	if (!data.is_active) {
		return null;
	}

	return {
		role: data.role as StaffRole,
		full_name: data.full_name as string,
		is_active: data.is_active as boolean
	};
}

/**
 * Get the user's role from the staff_members table.
 * Returns null if user is not found or deactivated.
 */
export async function getUserRole(locals: App.Locals): Promise<StaffRole | null> {
	const profile = await getStaffProfile(locals);
	return profile?.role ?? null;
}

/**
 * Require a specific role. Throws 403 if user's role is not in the allowed list.
 * Also requires authentication (redirects to /login if not authenticated).
 */
export async function requireRole(
	locals: App.Locals,
	allowedRoles: StaffRole[]
): Promise<AuthSession & { role: StaffRole; full_name: string }> {
	const authSession = await requireAuth(locals);
	const profile = await getStaffProfile(locals);

	if (!profile) {
		error(403, 'Forbidden — staff account not found or deactivated');
	}

	if (!allowedRoles.includes(profile.role)) {
		error(403, 'Forbidden — insufficient permissions');
	}

	return {
		...authSession,
		role: profile.role,
		full_name: profile.full_name
	};
}
