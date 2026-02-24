import { error, fail } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';
import {
	getBookingDetailById,
	getBookingById,
	updateBookingById,
	cancelBookingById,
	rollbackCancelledBooking
} from '$lib/server/db/bookings';
import { getActiveRoomsForBooking, getRoomById, updateRoomStatus, insertRoomStatusLog } from '$lib/server/db/rooms';
import { updateGuestNameById } from '$lib/server/db/guests';
import { UpdateBookingFormSchema, CancelBookingSchema } from '$lib/db/schema';

/** Returns YYYY-MM-DD in Vietnam timezone (UTC+7) */
function dateInVN(): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const booking = await getBookingDetailById(locals.supabase, params.bookingId);
	if (!booking) {
		error(404, 'Không tìm thấy đặt phòng');
	}

	const activeRooms = await getActiveRoomsForBooking(locals.supabase);
	const currentRoom = await getRoomById(locals.supabase, booking.room_id);
	const rooms =
		currentRoom && !activeRooms.some((room) => room.id === currentRoom.id)
			? [...activeRooms, currentRoom].sort((a, b) =>
				a.floor === b.floor ? a.room_number.localeCompare(b.room_number) : a.floor - b.floor
			)
			: activeRooms;

	const updateForm = await superValidate(
		{
			booking_id: booking.id,
			guest_id: booking.guest.id,
			guest_name: booking.guest.full_name,
			room_id: booking.room_id,
			check_in_date: booking.check_in_date,
			check_out_date: booking.check_out_date,
			booking_source: booking.booking_source ?? 'walk_in',
			is_long_stay: booking.nights_count >= 30,
			duration_days: booking.nights_count >= 30 ? booking.nights_count : undefined
		},
		zod4(UpdateBookingFormSchema)
	);

	const cancelForm = await superValidate(
		{
			booking_id: booking.id,
			room_id: booking.room_id,
			guest_name: booking.guest.full_name
		},
		zod4(CancelBookingSchema)
	);

	return { booking, rooms, updateForm, cancelForm };
};

export const actions: Actions = {
	submit: async ({ locals, request, params }) => {
		const form = await superValidate(request, zod4(UpdateBookingFormSchema));
		if (!form.valid) {
			return fail(400, { updateForm: form });
		}

		const { user } = await locals.safeGetSession();
		if (!user) {
			return message(form, { type: 'error', text: 'Phiên đăng nhập hết hạn' }, { status: 401 });
		}

		const booking = await getBookingById(locals.supabase, params.bookingId);
		if (!booking) {
			return message(form, { type: 'error', text: 'Không tìm thấy đặt phòng' }, { status: 404 });
		}
		if (booking.id !== form.data.booking_id) {
			return message(form, { type: 'error', text: 'Dữ liệu đặt phòng không hợp lệ' }, { status: 400 });
		}
		if (booking.guest_id !== form.data.guest_id) {
			return message(form, { type: 'error', text: 'Dữ liệu khách không hợp lệ' }, { status: 400 });
		}

		if (booking.status === 'cancelled' || booking.status === 'checked_out') {
			return message(form, { type: 'error', text: 'Không thể chỉnh sửa đặt phòng đã kết thúc' }, { status: 400 });
		}

		if (booking.status === 'checked_in' && form.data.room_id !== booking.room_id) {
			return message(
				form,
				{ type: 'error', text: 'Không thể đổi phòng khi khách đã check-in' },
				{ status: 400 }
			);
		}

		let checkOutDate = form.data.check_out_date;
		if (form.data.is_long_stay && form.data.duration_days) {
			const checkIn = new Date(form.data.check_in_date);
			checkIn.setDate(checkIn.getDate() + form.data.duration_days);
			checkOutDate = checkIn.toISOString().split('T')[0];
		}

		try {
			await updateGuestNameById(locals.supabase, booking.guest_id, form.data.guest_name);
			await updateBookingById(locals.supabase, params.bookingId, {
				room_id: form.data.room_id,
				check_in_date: form.data.check_in_date,
				check_out_date: checkOutDate,
				booking_source: form.data.booking_source
			});

			if (booking.status === 'checked_in') {
				await updateRoomStatus(locals.supabase, booking.room_id, 'occupied', form.data.guest_name);
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Không thể cập nhật đặt phòng';
			return message(form, { type: 'error', text: errorMessage }, { status: 500 });
		}

		return message(form, { type: 'success', text: 'Đã cập nhật đặt phòng' });
	},

	cancel: async ({ locals, request, params }) => {
		const form = await superValidate(request, zod4(CancelBookingSchema));
		if (!form.valid) {
			return fail(400, { cancelForm: form });
		}

		const { user } = await locals.safeGetSession();
		if (!user) {
			return message(form, { type: 'error', text: 'Phiên đăng nhập hết hạn' }, { status: 401 });
		}

		const booking = await getBookingById(locals.supabase, params.bookingId);
		if (!booking) {
			return message(form, { type: 'error', text: 'Không tìm thấy đặt phòng' }, { status: 404 });
		}
		if (booking.id !== form.data.booking_id || booking.room_id !== form.data.room_id) {
			return message(form, { type: 'error', text: 'Dữ liệu hủy đặt phòng không hợp lệ' }, { status: 400 });
		}

		if (booking.status === 'cancelled') {
			return message(form, { type: 'success', text: 'Đặt phòng đã ở trạng thái hủy' });
		}
		if (booking.status === 'checked_out') {
			return message(form, { type: 'error', text: 'Không thể hủy đặt phòng đã trả phòng' }, { status: 400 });
		}

		let bookingCancelled = false;
		try {
			await cancelBookingById(locals.supabase, params.bookingId);
			bookingCancelled = true;

			if (booking.status === 'checked_in') {
				const room = await getRoomById(locals.supabase, booking.room_id);
				if (room && room.status === 'occupied') {
					await updateRoomStatus(locals.supabase, booking.room_id, 'available', null);
					await insertRoomStatusLog(
						locals.supabase,
						booking.room_id,
						'occupied',
						'available',
						user.id,
						`Booking cancelled on ${dateInVN()}`
					);
				}
			}
		} catch (err) {
			try {
				if (bookingCancelled && booking.status !== 'cancelled') {
					await rollbackCancelledBooking(locals.supabase, params.bookingId, booking.status as 'confirmed' | 'checked_in');
				}
			} catch {
				// keep original error
			}
			const errorMessage = err instanceof Error ? err.message : 'Không thể hủy đặt phòng';
			return message(form, { type: 'error', text: errorMessage }, { status: 500 });
		}

		return message(form, { type: 'success', text: 'Đã hủy đặt phòng' });
	}
};
