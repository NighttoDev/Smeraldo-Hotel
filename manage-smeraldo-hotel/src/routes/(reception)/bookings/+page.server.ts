import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	// created=1 is set by the new booking action on success
	const created = url.searchParams.get('created') === '1';
	// Booking list — enhanced in Story 3.4
	return { bookings: [], created };
};
