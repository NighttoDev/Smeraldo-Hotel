import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { QueueBatchSchema, type QueueItem, type QueueSyncResult } from '$lib/utils/offlineQueue';
import { updateRoomStatus, getRoomById } from '$lib/server/db/rooms';
import { upsertAttendanceLog } from '$lib/server/db/attendance';
import { logStockIn, logStockOut } from '$lib/server/db/inventory';

function isServerNewer(serverTimestamp: string | null, itemTimestamp: string): boolean {
	const serverMs = serverTimestamp ? Date.parse(serverTimestamp) : Number.NaN;
	const itemMs = Date.parse(itemTimestamp);
	if (Number.isNaN(serverMs) || Number.isNaN(itemMs)) return false;
	return serverMs > itemMs;
}

function isConflictFromMessage(message: string): boolean {
	return /conflict|concurrent|not found|Không đủ hàng tồn kho/i.test(message);
}

async function getStoredSyncReceipt(
	locals: App.Locals,
	queueItemId: string
): Promise<QueueSyncResult | null> {
	const { data, error } = await locals.supabase
		.from('offline_sync_receipts')
		.select('queue_item_id, ok, error, conflict')
		.eq('queue_item_id', queueItemId)
		.maybeSingle();

	if (error) {
		throw new Error(error.message);
	}
	if (!data) return null;

	return {
		itemId: data.queue_item_id as string,
		ok: Boolean(data.ok),
		error: (data.error as string | null) ?? undefined,
		conflict: Boolean(data.conflict)
	};
}

async function storeSyncReceipt(
	locals: App.Locals,
	userId: string,
	item: QueueItem,
	result: QueueSyncResult
): Promise<void> {
	const { error } = await locals.supabase.from('offline_sync_receipts').upsert(
		{
			queue_item_id: item.id,
			action: item.action,
			ok: result.ok,
			error: result.error ?? null,
			conflict: result.conflict ?? false,
			processed_by: userId
		},
		{ onConflict: 'queue_item_id' }
	);

	if (error) {
		throw new Error(error.message);
	}
}

async function processQueueItem(item: QueueItem, locals: App.Locals, userId: string): Promise<QueueSyncResult> {
	try {
		switch (item.action) {
			case 'room_override_status': {
				const payload = item.payload as { room_id: string; new_status: Parameters<typeof updateRoomStatus>[2] };
				const room = await getRoomById(locals.supabase, payload.room_id);
				if (!room) {
					return { itemId: item.id, ok: false, error: 'ROOM_NOT_FOUND', conflict: true };
				}
				if (room.status === payload.new_status) {
					return { itemId: item.id, ok: true };
				}
				if (isServerNewer(room.updated_at, item.timestamp)) {
					return {
						itemId: item.id,
						ok: false,
						error: 'ROOM_STATUS_CONFLICT_STALE_TIMESTAMP',
						conflict: true
					};
				}
				await updateRoomStatus(locals.supabase, payload.room_id, payload.new_status);
				return { itemId: item.id, ok: true };
			}
			case 'attendance_log': {
				const payload = item.payload as { staff_id: string; log_date: string; shift_value: number };
				const { data: existingAttendance, error: attendanceReadError } = await locals.supabase
					.from('attendance_logs')
					.select('shift_value, updated_at')
					.eq('staff_id', payload.staff_id)
					.eq('log_date', payload.log_date)
					.maybeSingle();

				if (attendanceReadError) {
					throw new Error(attendanceReadError.message);
				}
				if (existingAttendance && Number(existingAttendance.shift_value) === payload.shift_value) {
					return { itemId: item.id, ok: true };
				}
				if (
					existingAttendance &&
					isServerNewer(existingAttendance.updated_at as string | null, item.timestamp)
				) {
					return {
						itemId: item.id,
						ok: false,
						error: 'ATTENDANCE_CONFLICT_STALE_TIMESTAMP',
						conflict: true
					};
				}

				const isManager = locals.userRole === 'manager';
				await upsertAttendanceLog(
					locals.supabase,
					payload.staff_id,
					payload.log_date,
					payload.shift_value,
					userId,
					isManager
				);
				return { itemId: item.id, ok: true };
			}
			case 'inventory_stock_in': {
				const payload = item.payload as { item_id: string; quantity: number; notes?: string | null };
				await logStockIn(locals.supabase, payload.item_id, payload.quantity, payload.notes ?? null, userId);
				return { itemId: item.id, ok: true };
			}
			case 'inventory_stock_out': {
				const payload = item.payload as {
					item_id: string;
					quantity: number;
					recipient_name: string;
					notes?: string | null;
				};
				await logStockOut(
					locals.supabase,
					payload.item_id,
					payload.quantity,
					payload.recipient_name,
					payload.notes ?? null,
					userId
				);
				return { itemId: item.id, ok: true };
			}
			default:
				return { itemId: item.id, ok: false, error: 'UNSUPPORTED_ACTION' };
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : 'SYNC_ITEM_FAILED';
		return { itemId: item.id, ok: false, error: message, conflict: isConflictFromMessage(message) };
	}
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		return json({ data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } }, { status: 401 });
	}

	if (!locals.userRole || !['manager', 'reception'].includes(locals.userRole)) {
		return json({ data: null, error: { message: 'Forbidden', code: 'FORBIDDEN' } }, { status: 403 });
	}

	try {
		const body = await request.json();
		const parsed = QueueBatchSchema.safeParse(body);
		if (!parsed.success) {
			return json({ data: null, error: { message: 'Invalid payload', code: 'INVALID_PAYLOAD' } }, { status: 400 });
		}

		const items = [...parsed.data.items].sort((a, b) => {
			if (a.timestamp !== b.timestamp) return a.timestamp.localeCompare(b.timestamp);
			return a.id.localeCompare(b.id);
		});

		const firstResultById = new Map<string, QueueSyncResult>();
		const results: QueueSyncResult[] = [];
		for (const item of items) {
			const existingResult = firstResultById.get(item.id);
			if (existingResult) {
				results.push(existingResult);
				continue;
			}

			const stored = await getStoredSyncReceipt(locals, item.id);
			if (stored) {
				firstResultById.set(item.id, stored);
				results.push(stored);
				continue;
			}

			const result = await processQueueItem(item, locals, user.id);
			await storeSyncReceipt(locals, user.id, item, result);
			firstResultById.set(item.id, result);
			results.push(result);
		}

		return json({ data: { results }, error: null });
	} catch (error) {
		return json(
			{
				data: null,
				error: {
					message: error instanceof Error ? error.message : 'Internal server error',
					code: 'SYNC_FAILED'
				}
			},
			{ status: 500 }
		);
	}
};
