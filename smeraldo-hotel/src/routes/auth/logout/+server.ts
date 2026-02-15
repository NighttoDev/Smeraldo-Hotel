// Logout endpoint — terminates Supabase session and redirects to /login
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals: { supabase } }) => {
	await supabase.auth.signOut();
	redirect(303, '/login');
};
