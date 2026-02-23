import { fail } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { getAllRooms, updateRoomStatus, getRoomById, insertRoomStatusLog } from '$lib/server/db/rooms';
import { getTodaysBookings, checkInBooking, getBookingById, getOccupiedBookings, checkOutBooking, validateBookingOwnership, rollbackCheckOut } from '$lib/server/db/bookings';
import { CheckInSchema, CheckOutSchema, RoomStatusSchema } from '$lib/db/schema';
import type { RoomStatus } from '$lib/db/schema';
import { getUserRole } from '$lib/server/auth';

/** Returns YYYY-MM-DD in Vietnam timezone (UTC+7) */
function dateInVN(): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
}

const OverrideStatusSchema = z.object({
	room_id: z.string().uuid(),
	new_status: RoomStatusSchema
});

export const load: PageServerLoad = async ({ locals }) => {
	const today = dateInVN();

	const [rooms, todaysBookings, occupiedBookings, overrideForm, checkInForm, checkOutForm] = await Promise.all([
		getAllRooms(locals.supabase),
		getTodaysBookings(locals.supabase, today),
		getOccupiedBookings(locals.supabase),
		superValidate(zod4(OverrideStatusSchema)),
		superValidate(zod4(CheckInSchema)),
		superValidate(zod4(CheckOutSchema))
	]);

	return { rooms, todaysBookings, occupiedBookings, overrideForm, checkInForm, checkOutForm };
};

export const actions: Actions = {
	overrideStatus: async ({ locals, request }) => {
		const form = await superValidate(request, zod4(OverrideStatusSchema));

		if (!form.valid) {
			return fail(400, { overrideForm: form });
		}

		const { room_id, new_status } = form.data;

		const room = await getRoomById(locals.supabase, room_id);
		if (!room) {
			return message(form, { type: 'error', text: 'Không tìm thấy phòng' }, { status: 404 });
		}

		const { user } = await locals.safeGetSession();
		if (!user) return message(form, { type: 'error', text: 'Phiên đăng nhập hết hạn' }, { status: 401 });

		const previousStatus = room.status;

		try {
			await updateRoomStatus(locals.supabase, room_id, new_status as RoomStatus);
			await insertRoomStatusLog(
				locals.supabase,
				room_id,
				previousStatus,
				new_status as RoomStatus,
				user.id
			);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Không thể cập nhật trạng thái';
			return message(form, { type: 'error', text: errorMessage }, { status: 500 });
		}

		return message(form, { type: 'success', text: 'Đã cập nhật trạng thái phòng' });
	},

	checkIn: async ({ locals, request }) => {
		const form = await superValidate(request, zod4(CheckInSchema));

		if (!form.valid) {
			return fail(400, { checkInForm: form });
		}

		const { booking_id, room_id, guest_id, guest_name, check_in_date } = form.data;

		const { user } = await locals.safeGetSession();
		if (!user) {
			return message(form, { type: 'error', text: 'Phiên đăng nhập hết hạn' }, { status: 401 });
		}

		// M2: Validate check-in date is today (prevents off-day check-ins)
		const today = dateInVN();
		if (check_in_date !== today) {
			return message(
				form,
				{ type: 'error', text: 'Không thể check-in trước hoặc sau ngày đến' },
				{ status: 400 }
			);
		}

		const room = await getRoomById(locals.supabase, room_id);
		if (!room) {
			return message(form, { type: 'error', text: 'Không tìm thấy phòng' }, { status: 404 });
		}

		// H3: Idempotency guard — prevent double check-in
		if (room.status === 'occupied') {
			return message(form, { type: 'error', text: 'Phòng này đã có khách' }, { status: 409 });
		}

		// H2: Verify booking belongs to this room and is still confirmed
		const booking = await getBookingById(locals.supabase, booking_id);
		const ownershipCheck = validateBookingOwnership(booking, room_id);
		if (!ownershipCheck.valid) {
			return message(form, { type: 'error', text: ownershipCheck.error! }, { status: 400 });
		}
		if (booking!.status !== 'confirmed') {
			return message(
				form,
				{ type: 'error', text: 'Đặt phòng không ở trạng thái có thể check-in' },
				{ status: 400 }
			);
		}

		const previousStatus = room.status;

		try {
			// Step 1: update booking status + guest name
			await checkInBooking(locals.supabase, booking_id, guest_id, guest_name);

			// Step 2: update room status → occupied with guest name (triggers Realtime)
			await updateRoomStatus(locals.supabase, room_id, 'occupied', guest_name);

			// Step 3: audit trail
			await insertRoomStatusLog(locals.supabase, room_id, previousStatus, 'occupied', user.id);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Không thể check-in';
			return message(form, { type: 'error', text: errorMessage }, { status: 500 });
		}

		return message(form, { type: 'success', text: 'Check-in thành công' });
	},

	checkOut: async ({ locals, request }) => {
		const form = await superValidate(request, zod4(CheckOutSchema));

		if (!form.valid) {
			return fail(400, { checkOutForm: form });
		}

		const { booking_id, room_id } = form.data;

		const { user } = await locals.safeGetSession();
		if (!user) {
			return message(form, { type: 'error', text: 'Phiên đăng nhập hết hạn' }, { status: 401 });
		}

		// Verify booking exists and belongs to this room
		const booking = await getBookingById(locals.supabase, booking_id);
		const ownershipCheck = validateBookingOwnership(booking, room_id);
		if (!ownershipCheck.valid) {
			return message(form, { type: 'error', text: ownershipCheck.error! }, { status: 400 });
		}

		if (booking!.status !== 'checked_in') {
			return message(
				form,
				{ type: 'error', text: 'Đặt phòng không ở trạng thái có thể trả phòng' },
				{ status: 400 }
			);
		}

		// FIX #2: Validate check-out date — prevent early check-outs for non-managers
		const today = dateInVN();
		const checkOutDate = booking!.check_out_date;
		let managerOverrideNotes: string | null = null;

		if (today < checkOutDate) {
			// Early check-out — requires manager role
			const userRole = await getUserRole(locals);
			if (userRole !== 'manager') {
				return message(
					form,
					{ type: 'error', text: 'Chỉ manager mới có thể trả phòng trước ngày dự kiến' },
					{ status: 403 }
				);
			}
			// FIX #9: Log manager override reason in audit trail
			managerOverrideNotes = `Manager early check-out: scheduled ${checkOutDate}, actual ${today}`;
		}

		// Idempotency guard — room must be occupied
		const room = await getRoomById(locals.supabase, room_id);
		if (!room) {
			return message(form, { type: 'error', text: 'Không tìm thấy phòng' }, { status: 404 });
		}
		if (room.status !== 'occupied') {
			return message(
				form,
				{ type: 'error', text: 'Phòng không ở trạng thái có khách' },
				{ status: 409 }
			);
		}

		// FIX #1: Compensating transaction pattern to handle partial failures
		let bookingUpdated = false;
		let roomUpdated = false;

		try {
			// Step 1: mark booking as checked_out
			await checkOutBooking(locals.supabase, booking_id);
			bookingUpdated = true;

			// Step 2: transition room to being_cleaned, clear guest name (triggers Realtime)
			await updateRoomStatus(locals.supabase, room_id, 'being_cleaned', null);
			roomUpdated = true;

			// Step 3: audit trail (with manager override notes if applicable)
			await insertRoomStatusLog(
				locals.supabase,
				room_id,
				room.status,
				'being_cleaned',
				user.id,
				managerOverrideNotes
			);
		} catch (err) {
			// FIX #1: Rollback on partial failure
			try {
				if (bookingUpdated && !roomUpdated) {
					// Booking was updated but room update failed — rollback booking
					await rollbackCheckOut(locals.supabase, booking_id);
				}
			} catch (rollbackErr) {
				console.error('Rollback failed:', rollbackErr);
				// Fall through to return original error
			}

			// FIX #7: Better error messages based on error type
			let errorMessage = 'Không thể trả phòng';
			if (err instanceof Error) {
				if (err.message.includes('network') || err.message.includes('fetch')) {
					errorMessage = 'Lỗi kết nối mạng. Vui lòng thử lại';
				} else if (err.message.includes('permission') || err.message.includes('policy')) {
					errorMessage = 'Không có quyền thực hiện thao tác này';
				} else if (err.message.includes('concurrent') || err.message.includes('conflict')) {
					errorMessage = 'Phòng đã được cập nhật bởi người dùng khác. Vui lòng làm mới trang';
				} else {
					errorMessage = `Lỗi hệ thống: ${err.message}`;
				}
			}
			return message(form, { type: 'error', text: errorMessage }, { status: 500 });
		}

		return message(form, { type: 'success', text: 'Trả phòng thành công' });
	}
};
