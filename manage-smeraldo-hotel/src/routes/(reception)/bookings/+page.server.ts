import type { PageServerLoad } from './$types';
import { getBookingListItems } from '$lib/server/db/bookings';

export const load: PageServerLoad = async ({ url, locals }) => {
	// created=1 is set by the new booking action on success
	const created = url.searchParams.get('created') === '1';
	const bookings = await getBookingListItems(locals.supabase);
	return { bookings, created };
};
