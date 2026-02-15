// Reception route group — requires 'reception' or 'manager' role
import type { LayoutServerLoad } from './$types';
import { requireRole } from '$lib/server/auth';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { role, full_name } = await requireRole(locals, ['reception', 'manager']);
	return { role, fullName: full_name };
};
