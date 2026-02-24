import { describe, it, expect } from 'vitest';
import {
	QueueItemSchema,
	QueueBatchSchema,
	isQueueItemExceededRetries,
	OFFLINE_QUEUE_MAX_RETRIES
} from './offlineQueue';

describe('offlineQueue schemas', () => {
	it('validates queue item shape', () => {
		const item = QueueItemSchema.parse({
			id: '11111111-1111-4111-8111-111111111111',
			action: 'attendance_log',
			payload: {
				staff_id: '22222222-2222-4222-8222-222222222222',
				log_date: '2026-02-24',
				shift_value: 1
			},
			timestamp: '2026-02-24T10:00:00.000Z',
			retries: 0
		});
		expect(item.action).toBe('attendance_log');
	});

	it('sort payload wrapper accepts items list', () => {
		const parsed = QueueBatchSchema.parse({ items: [] });
		expect(parsed.items).toEqual([]);
	});
});

describe('offlineQueue retry helpers', () => {
	it('marks item as exceeded after max retries', () => {
		expect(
			isQueueItemExceededRetries({
				id: '11111111-1111-4111-8111-111111111111',
				action: 'room_override_status',
				payload: {
					room_id: '33333333-3333-4333-8333-333333333333',
					new_status: 'ready'
				},
				timestamp: '2026-02-24T10:00:00.000Z',
				retries: OFFLINE_QUEUE_MAX_RETRIES
			})
		).toBe(true);
	});
});
