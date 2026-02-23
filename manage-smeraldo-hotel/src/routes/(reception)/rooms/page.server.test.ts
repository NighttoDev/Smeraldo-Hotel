// FIX #7: Integration tests for check-out validation logic
// Note: Full SvelteKit action testing requires e2e tests (Playwright)
// These tests verify the validation helper functions used by the action

import { describe, it, expect } from 'vitest';
import { validateBookingOwnership } from '$lib/server/db/bookings';

// ── Check-Out Validation Tests ───────────────────────────────────────────────

describe('check-out validation helpers', () => {
	const mockBooking = {
		id: '123e4567-e89b-12d3-a456-426614174000',
		room_id: '123e4567-e89b-12d3-a456-426614174001',
		guest_id: 'guest-123',
		check_in_date: '2026-02-22',
		check_out_date: '2026-02-23',
		nights_count: 1,
		booking_source: 'walk_in' as const,
		status: 'checked_in',
		created_by: null,
		created_at: '2026-02-22T00:00:00Z',
		updated_at: '2026-02-22T00:00:00Z'
	};

	describe('validateBookingOwnership', () => {
		it('passes validation when booking matches room', () => {
			const result = validateBookingOwnership(mockBooking, mockBooking.room_id);
			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('fails when booking is null', () => {
			const result = validateBookingOwnership(null, mockBooking.room_id);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('Không tìm thấy đặt phòng');
		});

		it('fails when booking belongs to different room', () => {
			const result = validateBookingOwnership(mockBooking, 'different-room-id');
			expect(result.valid).toBe(false);
			expect(result.error).toBe('Đặt phòng không khớp với phòng được chọn');
		});
	});

	// Integration test documentation:
	// Full check-out action flow should be tested with Playwright e2e tests covering:
	// - Successful check-out updates booking + room + audit log
	// - Idempotency guard prevents double check-out
	// - Manager role required for early check-out (before check_out_date)
	// - Rollback on partial failure (booking updated but room update fails)
	// - Error messages for network errors, permission errors, concurrent updates
});
