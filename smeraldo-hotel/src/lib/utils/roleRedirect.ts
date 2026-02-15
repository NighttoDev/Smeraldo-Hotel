/**
 * Map a staff role to their home page path.
 * Used after login and for root page redirect.
 */
export type StaffRole = 'manager' | 'reception' | 'housekeeping';

const ROLE_HOME_PATHS: Record<StaffRole, string> = {
	manager: '/dashboard',
	reception: '/rooms',
	housekeeping: '/my-rooms'
};

/** Get the home page path for a given role */
export function getRoleHomePath(role: StaffRole): string {
	return ROLE_HOME_PATHS[role] ?? '/login';
}
