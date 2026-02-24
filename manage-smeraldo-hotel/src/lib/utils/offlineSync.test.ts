import { beforeEach, describe, expect, it, vi } from 'vitest';

const queueMocks = vi.hoisted(() => ({
	OFFLINE_QUEUE_MAX_RETRIES: 3,
	getQueueItemCount: vi.fn(),
	getQueuedItems: vi.fn(),
	incrementQueueItemRetry: vi.fn(),
	isQueueItemExceededRetries: vi.fn((item: { retries: number }) => item.retries >= 3),
	removeQueuedItem: vi.fn(),
	resetQueueItemRetry: vi.fn()
}));

const storeMocks = vi.hoisted(() => ({
	clearOfflineSyncError: vi.fn(),
	markRealtimeActivity: vi.fn(),
	setOfflineQueueCount: vi.fn(),
	setOfflineSyncError: vi.fn()
}));

vi.mock('$lib/utils/offlineQueue', () => queueMocks);
vi.mock('$lib/stores/realtimeStatus', () => storeMocks);

import { flushOfflineQueue, retryFailedOfflineSync } from './offlineSync';

describe('offlineSync', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		queueMocks.getQueueItemCount.mockResolvedValue(0);
		queueMocks.getQueuedItems.mockResolvedValue([]);
		queueMocks.incrementQueueItemRetry.mockResolvedValue(null);
		queueMocks.resetQueueItemRetry.mockResolvedValue(null);
		(globalThis as { fetch?: typeof fetch }).fetch = vi.fn();
		Object.defineProperty(globalThis, 'navigator', {
			value: { onLine: true },
			configurable: true
		});
	});

	it('increments retry for all retryable items when sync request fails', async () => {
		queueMocks.getQueuedItems.mockResolvedValue([
			{
				id: '11111111-1111-4111-8111-111111111111',
				action: 'attendance_log',
				payload: { staff_id: 'a', log_date: '2026-02-24', shift_value: 1 },
				timestamp: '2026-02-24T10:00:00.000Z',
				retries: 0
			},
			{
				id: '22222222-2222-4222-8222-222222222222',
				action: 'inventory_stock_in',
				payload: { item_id: 'b', quantity: 1, notes: null },
				timestamp: '2026-02-24T10:01:00.000Z',
				retries: 1
			}
		]);
		(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network'));
		queueMocks.incrementQueueItemRetry
			.mockResolvedValueOnce({ retries: 1 })
			.mockResolvedValueOnce({ retries: 2 });

		await flushOfflineQueue();

		expect(queueMocks.incrementQueueItemRetry).toHaveBeenCalledTimes(2);
		expect(queueMocks.removeQueuedItem).not.toHaveBeenCalled();
	});

	it('removes successful items and marks realtime activity', async () => {
		queueMocks.getQueuedItems.mockResolvedValue([
			{
				id: '11111111-1111-4111-8111-111111111111',
				action: 'room_override_status',
				payload: { room_id: '33333333-3333-4333-8333-333333333333', new_status: 'ready' },
				timestamp: '2026-02-24T10:00:00.000Z',
				retries: 0
			}
		]);
		(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
			ok: true,
			json: async () => ({ data: { results: [{ itemId: '11111111-1111-4111-8111-111111111111', ok: true }] }, error: null })
		});

		await flushOfflineQueue();

		expect(queueMocks.removeQueuedItem).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111');
		expect(storeMocks.markRealtimeActivity).toHaveBeenCalled();
	});

	it('surfaces persistent error when all queued items exceeded retries', async () => {
		queueMocks.getQueuedItems.mockResolvedValue([
			{
				id: '11111111-1111-4111-8111-111111111111',
				action: 'inventory_stock_out',
				payload: { item_id: 'b', quantity: 2, recipient_name: 'Khách', notes: null },
				timestamp: '2026-02-24T10:00:00.000Z',
				retries: 3
			}
		]);

		await flushOfflineQueue();

		expect(storeMocks.setOfflineSyncError).toHaveBeenCalled();
		expect(globalThis.fetch).not.toHaveBeenCalled();
	});

	it('increments retry for items missing from sync response payload', async () => {
		queueMocks.getQueuedItems.mockResolvedValue([
			{
				id: '11111111-1111-4111-8111-111111111111',
				action: 'attendance_log',
				payload: { staff_id: 'a', log_date: '2026-02-24', shift_value: 1 },
				timestamp: '2026-02-24T10:00:00.000Z',
				retries: 0
			},
			{
				id: '22222222-2222-4222-8222-222222222222',
				action: 'inventory_stock_in',
				payload: { item_id: 'b', quantity: 1, notes: null },
				timestamp: '2026-02-24T10:01:00.000Z',
				retries: 0
			}
		]);
		(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
			ok: true,
			json: async () => ({
				data: { results: [{ itemId: '11111111-1111-4111-8111-111111111111', ok: true }] },
				error: null
			})
		});
		queueMocks.incrementQueueItemRetry.mockResolvedValue({ retries: 1 });

		await flushOfflineQueue();

		expect(queueMocks.removeQueuedItem).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111');
		expect(queueMocks.incrementQueueItemRetry).toHaveBeenCalledWith('22222222-2222-4222-8222-222222222222');
	});

	it('manual retry resets blocked items then flushes', async () => {
		queueMocks.getQueuedItems
			.mockResolvedValueOnce([
				{
					id: '11111111-1111-4111-8111-111111111111',
					action: 'attendance_log',
					payload: { staff_id: 'a', log_date: '2026-02-24', shift_value: 1 },
					timestamp: '2026-02-24T10:00:00.000Z',
					retries: 3
				}
			])
			.mockResolvedValueOnce([]);

		await retryFailedOfflineSync();

		expect(queueMocks.resetQueueItemRetry).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111');
		expect(storeMocks.clearOfflineSyncError).toHaveBeenCalled();
	});
});
