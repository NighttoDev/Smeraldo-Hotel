import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getRoleHomePath } from '$lib/utils/roleRedirect';

export const load: PageServerLoad = async ({ locals: { safeGetSession, supabase } }) => {
	const { session, user } = await safeGetSession();

	// Already logged in — redirect to role-appropriate home
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

export const actions: Actions = {
	default: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		// Basic validation
		if (!email || !email.includes('@')) {
			return fail(400, {
				error: 'Vui lòng nhập email hợp lệ',
				email
			});
		}

		if (!password || password.length < 6) {
			return fail(400, {
				error: 'Mật khẩu phải có ít nhất 6 ký tự',
				email
			});
		}

		// Sign in with email + password
		const { error } = await supabase.auth.signInWithPassword({
			email,
			password
		});

		if (error) {
			return fail(400, {
				error: 'Email hoặc mật khẩu không đúng',
				email
			});
		}

		// Fetch role for redirect
		const {
			data: { user }
		} = await supabase.auth.getUser();

		if (user) {
			const { data: staff } = await supabase
				.from('staff_members')
				.select('role')
				.eq('id', user.id)
				.single();

			if (staff?.role) {
				redirect(303, getRoleHomePath(staff.role));
			}
		}

		// Fallback redirect
		redirect(303, '/');
	}
};
