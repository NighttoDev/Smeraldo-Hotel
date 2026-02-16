import { fail, redirect } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';
import { getActiveRoomsForBooking } from '$lib/server/db/rooms';
import { createGuest } from '$lib/server/db/guests';
import { createBooking } from '$lib/server/db/bookings';
import { CreateBookingFormSchema } from '$lib/db/schema';

/** Returns YYYY-MM-DD in Vietnam timezone (UTC+7) */
function dateInVN(offsetDays = 0): string {
	const ms = Date.now() + offsetDays * 24 * 60 * 60 * 1000;
	return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(ms));
}

export const load: PageServerLoad = async ({ locals }) => {
	const rooms = await getActiveRoomsForBooking(locals.supabase);

	const form = await superValidate(
		{ check_in_date: dateInVN(0), check_out_date: dateInVN(1), is_long_stay: false },
		zod4(CreateBookingFormSchema)
	);

	return { rooms, form };
};

export const actions: Actions = {
	submit: async ({ locals, request }) => {
		const form = await superValidate(request, zod4(CreateBookingFormSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const { user } = await locals.safeGetSession();
		if (!user) {
			return message(form, { type: 'error', text: 'Phiên đăng nhập hết hạn' }, { status: 401 });
		}

		// Compute check_out_date for long-stay bookings
		let checkOutDate = form.data.check_out_date;
		if (form.data.is_long_stay && form.data.duration_days) {
			const checkIn = new Date(form.data.check_in_date);
			checkIn.setDate(checkIn.getDate() + form.data.duration_days);
			checkOutDate = checkIn.toISOString().split('T')[0];
		}

		try {
			// Step 1: create guest record
			const guest = await createGuest(locals.supabase, {
				full_name: form.data.guest_name
			});

			// Step 2: create booking with new guest_id
			await createBooking(locals.supabase, {
				room_id: form.data.room_id,
				guest_id: guest.id,
				check_in_date: form.data.check_in_date,
				check_out_date: checkOutDate,
				booking_source: form.data.booking_source,
				created_by: user.id
			});
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Không thể tạo đặt phòng';
			return message(form, { type: 'error', text: errorMessage }, { status: 500 });
		}

		redirect(303, '/bookings?created=1');
	}
};
