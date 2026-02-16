import { describe, it, expect } from 'vitest';
import { validateAttendanceWrite } from '$lib/utils/attendance-rbac';

/**
 * Tests for the RBAC date validation logic in ?/logAttendance Form Action.
 *
 * This tests the shared validateAttendanceWrite helper that mirrors the exact
 * logic in +page.server.ts:
 *   - Role gate: only 'manager' and 'reception' can write attendance
 *   - Date gate: reception can only write today (Vietnam TZ); managers bypass
 */

describe('+page.server.ts ?/logAttendance RBAC', () => {
	// Fixed date for deterministic tests — not dependent on system clock
	const todayVN = '2026-02-16';
	const pastDate = '2026-01-15';
	const futureDate = '2026-03-01';

	describe('manager role', () => {
		it('allows submission for today', () => {
			expect(validateAttendanceWrite('manager', todayVN, todayVN)).toBeNull();
		});

		it('allows submission for past dates', () => {
			expect(validateAttendanceWrite('manager', pastDate, todayVN)).toBeNull();
		});

		it('allows submission for future dates', () => {
			expect(validateAttendanceWrite('manager', futureDate, todayVN)).toBeNull();
		});
	});

	describe('reception role', () => {
		it('allows submission for today', () => {
			expect(validateAttendanceWrite('reception', todayVN, todayVN)).toBeNull();
		});

		it('blocks submission for past dates', () => {
			expect(validateAttendanceWrite('reception', pastDate, todayVN)).toBe(
				'Lễ tân chỉ được chấm công ngày hôm nay'
			);
		});

		it('blocks submission for future dates', () => {
			expect(validateAttendanceWrite('reception', futureDate, todayVN)).toBe(
				'Lễ tân chỉ được chấm công ngày hôm nay'
			);
		});
	});

	describe('unauthorized roles', () => {
		it('blocks housekeeping role', () => {
			expect(validateAttendanceWrite('housekeeping', todayVN, todayVN)).toBe(
				'Không có quyền chấm công'
			);
		});

		it('blocks empty role', () => {
			expect(validateAttendanceWrite('', todayVN, todayVN)).toBe(
				'Không có quyền chấm công'
			);
		});
	});
});
