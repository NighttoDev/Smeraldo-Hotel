import { fail, error } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import {
	getRoomsNeedingCleaning,
	updateRoomStatus,
	getRoomById,
	insertRoomStatusLog
} from '$lib/server/db/rooms';

const MarkReadySchema = z.object({
	room_id: z.string().uuid()
});

export const load: PageServerLoad = async ({ locals }) => {
	const [rooms, markReadyForm] = await Promise.all([
		getRoomsNeedingCleaning(locals.supabase),
		superValidate(zod4(MarkReadySchema))
	]);
	return { rooms, markReadyForm };
};

export const actions: Actions = {
	markReady: async ({ locals, request }) => {
		const form = await superValidate(request, zod4(MarkReadySchema));

		if (!form.valid) {
			return fail(400, { markReadyForm: form });
		}

		const { room_id } = form.data;

		const room = await getRoomById(locals.supabase, room_id);
		if (!room) {
			return message(form, { type: 'error', text: 'Không tìm thấy phòng' }, { status: 404 });
		}

		const previousStatus = room.status;

		try {
			await updateRoomStatus(locals.supabase, room_id, 'ready');

			const { user } = await locals.safeGetSession();
			if (!user) throw error(401, 'Unauthorized');

			await insertRoomStatusLog(
				locals.supabase,
				room_id,
				previousStatus,
				'ready',
				user.id
			);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Không thể cập nhật trạng thái';
			return message(form, { type: 'error', text: errorMessage }, { status: 500 });
		}

		return message(form, { type: 'success', text: 'Phòng đã sẵn sàng!' });
	}
};
