import { fail, error } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { getAllRooms, updateRoomStatus, getRoomById, insertRoomStatusLog } from '$lib/server/db/rooms';
import type { RoomStatus } from '$lib/server/db/rooms';

const OverrideStatusSchema = z.object({
	room_id: z.string().uuid(),
	new_status: z.enum(['available', 'occupied', 'checking_out_today', 'being_cleaned', 'ready'])
});

export const load: PageServerLoad = async ({ locals }) => {
	const [rooms, overrideForm] = await Promise.all([
		getAllRooms(locals.supabase),
		superValidate(zod4(OverrideStatusSchema))
	]);
	return { rooms, overrideForm };
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

		const previousStatus = room.status;

		try {
			await updateRoomStatus(locals.supabase, room_id, new_status as RoomStatus);

			const { user } = await locals.safeGetSession();
			if (!user) throw error(401, 'Unauthorized');

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
	}
};
