// Root page — redirect authenticated users to role-appropriate home
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getRoleHomePath } from '$lib/utils/roleRedirect';

export const load: PageServerLoad = async ({ locals: { safeGetSession, supabase } }) => {
	const { session, user } = await safeGetSession();

	if (session && user) {
		const { data: staff } = await supabase
			.from('staff_members')
			.select('role')
			.eq('id', user.id)
			.single();

		if (staff?.role) {
			redirect(303, getRoleHomePath(staff.role));
		}
	}

	return {};
};
