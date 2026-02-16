import { describe, it, expect } from 'vitest';
import { isAttendanceDateDisabled } from '$lib/utils/attendance-rbac';

/**
 * Tests for the shared isAttendanceDateDisabled function used in AttendanceTable.svelte.
 *
 * This tests the shared RBAC helper that mirrors the exact logic in AttendanceTable.svelte:
 * - Manager: all dates are editable (returns false always)
 * - Non-manager (reception): only today is editable; past/future dates disabled
 */

describe('AttendanceTable isDisabled logic', () => {
	const today = '2026-02-16';

	describe('manager role', () => {
		it('returns false for today — manager can edit', () => {
			expect(isAttendanceDateDisabled('manager', today, today)).toBe(false);
		});

		it('returns false for past dates — manager can edit any date', () => {
			expect(isAttendanceDateDisabled('manager', '2026-02-01', today)).toBe(false);
			expect(isAttendanceDateDisabled('manager', '2026-01-15', today)).toBe(false);
			expect(isAttendanceDateDisabled('manager', '2025-12-31', today)).toBe(false);
		});

		it('returns false for future dates — manager can edit any date', () => {
			expect(isAttendanceDateDisabled('manager', '2026-02-28', today)).toBe(false);
			expect(isAttendanceDateDisabled('manager', '2026-03-01', today)).toBe(false);
		});
	});

	describe('reception role', () => {
		it('returns false for today — reception can edit today only', () => {
			expect(isAttendanceDateDisabled('reception', today, today)).toBe(false);
		});

		it('returns true for past dates — reception cannot edit history', () => {
			expect(isAttendanceDateDisabled('reception', '2026-02-01', today)).toBe(true);
			expect(isAttendanceDateDisabled('reception', '2026-01-15', today)).toBe(true);
		});

		it('returns true for future dates — reception cannot edit future', () => {
			expect(isAttendanceDateDisabled('reception', '2026-02-28', today)).toBe(true);
		});
	});

	describe('non-manager/non-reception role', () => {
		it('can only edit today (same behavior as reception)', () => {
			expect(isAttendanceDateDisabled('housekeeping', today, today)).toBe(false);
			expect(isAttendanceDateDisabled('housekeeping', '2026-02-01', today)).toBe(true);
		});
	});
});
