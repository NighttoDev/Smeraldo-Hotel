// Manager route group — requires 'manager' role
import type { LayoutServerLoad } from './$types';
import { requireRole } from '$lib/server/auth';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { role, full_name } = await requireRole(locals, ['manager']);
	return { role, fullName: full_name };
};
