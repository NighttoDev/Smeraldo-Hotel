import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';

const {
	getRoomByIdMock,
	updateRoomStatusMock,
	upsertAttendanceLogMock,
	logStockInMock,
	logStockOutMock
} = vi.hoisted(() => ({
	getRoomByIdMock: vi.fn(),
	updateRoomStatusMock: vi.fn(),
	upsertAttendanceLogMock: vi.fn(),
	logStockInMock: vi.fn(),
	logStockOutMock: vi.fn()
}));

vi.mock('$lib/server/db/rooms', () => ({
	getRoomById: getRoomByIdMock,
	updateRoomStatus: updateRoomStatusMock
}));

vi.mock('$lib/server/db/attendance', () => ({
	upsertAttendanceLog: upsertAttendanceLogMock
}));

vi.mock('$lib/server/db/inventory', () => ({
	logStockIn: logStockInMock,
	logStockOut: logStockOutMock
}));

function makeRequest(body: unknown): Request {
	return new Request('http://localhost/api/sync', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
}

function makeLocals(overrides?: Partial<App.Locals>): App.Locals {
	const receiptSelectChain = {
		eq: vi.fn().mockReturnThis(),
		maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
	};
	const attendanceSelectChain = {
		eq: vi.fn().mockReturnThis(),
		maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
	};
	const upsertMock = vi.fn().mockResolvedValue({ error: null });
	const fromMock = vi.fn((table: string) => {
		if (table === 'offline_sync_receipts') {
			return {
				select: vi.fn(() => receiptSelectChain),
				upsert: upsertMock
			};
		}
		if (table === 'attendance_logs') {
			return {
				select: vi.fn(() => attendanceSelectChain)
			};
		}
		return {
			select: vi.fn(() => attendanceSelectChain)
		};
	});

	const base = {
		supabase: {
			from: fromMock
		} as unknown as App.Locals['supabase'],
		safeGetSession: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }),
		userRole: 'manager',
		userFullName: 'Test User'
	} as unknown as App.Locals;

	return { ...base, ...overrides };
}

describe('POST /api/sync', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns unauthorized when there is no session user', async () => {
		const response = await POST({
			request: makeRequest({ items: [] }),
			locals: makeLocals({ safeGetSession: vi.fn().mockResolvedValue({ user: null }) })
		} as Parameters<typeof POST>[0]);

		expect(response.status).toBe(401);
	});

	it('returns invalid payload for malformed queue data', async () => {
		const response = await POST({
			request: makeRequest({ items: [{ id: 'not-a-uuid' }] }),
			locals: makeLocals()
		} as Parameters<typeof POST>[0]);

		expect(response.status).toBe(400);
	});

	it('skips duplicate queue ids in same batch', async () => {
		getRoomByIdMock.mockResolvedValue({
			id: '33333333-3333-4333-8333-333333333333',
			status: 'available',
			updated_at: '2026-02-24T10:00:00.000Z'
		});
		updateRoomStatusMock.mockResolvedValue({});

		const item = {
			id: '11111111-1111-4111-8111-111111111111',
			action: 'room_override_status',
			payload: {
				room_id: '33333333-3333-4333-8333-333333333333',
				new_status: 'ready'
			},
			timestamp: '2026-02-24T10:00:00.000Z',
			retries: 0
		};

		const response = await POST({
			request: makeRequest({ items: [item, item] }),
			locals: makeLocals()
		} as Parameters<typeof POST>[0]);

		const body = await response.json();
		expect(response.status).toBe(200);
		expect(updateRoomStatusMock).toHaveBeenCalledTimes(1);
		expect(body.data.results).toHaveLength(2);
		expect(body.data.results[0]).toEqual({ itemId: item.id, ok: true });
		expect(body.data.results[1]).toEqual({ itemId: item.id, ok: true });
	});

	it('returns conflict when room has newer server timestamp', async () => {
		getRoomByIdMock.mockResolvedValue({
			id: '33333333-3333-4333-8333-333333333333',
			status: 'occupied',
			updated_at: '2026-02-24T12:00:00.000Z'
		});

		const response = await POST({
			request: makeRequest({
				items: [
					{
						id: '11111111-1111-4111-8111-111111111111',
						action: 'room_override_status',
						payload: {
							room_id: '33333333-3333-4333-8333-333333333333',
							new_status: 'ready'
						},
						timestamp: '2026-02-24T10:00:00.000Z',
						retries: 0
					}
				]
			}),
			locals: makeLocals()
		} as Parameters<typeof POST>[0]);

		const body = await response.json();
		expect(response.status).toBe(200);
		expect(updateRoomStatusMock).not.toHaveBeenCalled();
		expect(body.data.results[0]).toEqual({
			itemId: '11111111-1111-4111-8111-111111111111',
			ok: false,
			error: 'ROOM_STATUS_CONFLICT_STALE_TIMESTAMP',
			conflict: true
		});
	});

	it('returns stored receipt for retried queue item without reprocessing side effects', async () => {
		getRoomByIdMock.mockResolvedValue({
			id: '33333333-3333-4333-8333-333333333333',
			status: 'available',
			updated_at: '2026-02-24T10:00:00.000Z'
		});
		updateRoomStatusMock.mockResolvedValue({});

		const receiptSelectChain = {
			eq: vi.fn().mockReturnThis(),
			maybeSingle: vi
				.fn()
				.mockResolvedValueOnce({
					data: {
						queue_item_id: '11111111-1111-4111-8111-111111111111',
						ok: true,
						error: null,
						conflict: false
					},
					error: null
				})
		};
		const locals = makeLocals({
			supabase: {
				from: vi.fn((table: string) => {
					if (table === 'offline_sync_receipts') {
						return {
							select: vi.fn(() => receiptSelectChain),
							upsert: vi.fn().mockResolvedValue({ error: null })
						};
					}
					return {
						select: vi.fn(() => ({
							eq: vi.fn().mockReturnThis(),
							maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
						}))
					};
				})
			} as unknown as App.Locals['supabase']
		});

		const response = await POST({
			request: makeRequest({
				items: [
					{
						id: '11111111-1111-4111-8111-111111111111',
						action: 'room_override_status',
						payload: {
							room_id: '33333333-3333-4333-8333-333333333333',
							new_status: 'ready'
						},
						timestamp: '2026-02-24T10:00:00.000Z',
						retries: 1
					}
				]
			}),
			locals
		} as Parameters<typeof POST>[0]);

		const body = await response.json();
		expect(response.status).toBe(200);
		expect(updateRoomStatusMock).not.toHaveBeenCalled();
		expect(body.data.results[0]).toEqual({
			itemId: '11111111-1111-4111-8111-111111111111',
			ok: true,
			conflict: false
		});
	});
});
