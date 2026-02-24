import { fail } from '@sveltejs/kit';
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

		const { user } = await locals.safeGetSession();
		if (!user) return message(form, { type: 'error', text: 'Phiên đăng nhập hết hạn' }, { status: 401 });

		const previousStatus = room.status;

		try {
			await updateRoomStatus(locals.supabase, room_id, 'ready');
			await insertRoomStatusLog(
				locals.supabase,
				room_id,
				previousStatus,
				'ready',
				user.id
			);

			// Trigger room-ready notification (Story 7.4)
			// Non-blocking: don't fail room status update if notification fails
			try {
				const response = await fetch('/api/notifications', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						type: 'room-ready',
						payload: {
							roomNumber: room.room_number
						}
					})
				});

				if (!response.ok) {
					console.error('Room-ready notification failed:', await response.text());
				}
			} catch (notifError) {
				// Log error but don't fail the room status update
				console.error('Failed to send room-ready notification:', notifError);
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Không thể cập nhật trạng thái';
			return message(form, { type: 'error', text: errorMessage }, { status: 500 });
		}

		return message(form, { type: 'success', text: 'Phòng đã sẵn sàng!' });
	}
};
