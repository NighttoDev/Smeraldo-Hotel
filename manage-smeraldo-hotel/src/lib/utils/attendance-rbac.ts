/**
 * Whether a given date's attendance cell should be disabled for editing.
 * Managers can edit any date; other roles can only edit today.
 */
export function isAttendanceDateDisabled(userRole: string, date: string, todayVN: string): boolean {
	if (userRole === 'manager') return false;
	return date !== todayVN;
}

/**
 * Validate whether a role is allowed to write attendance for a given date.
 * Returns an error message string if blocked, or null if allowed.
 */
export function validateAttendanceWrite(
	userRole: string,
	logDate: string,
	todayVN: string
): string | null {
	if (!userRole || !['manager', 'reception'].includes(userRole)) {
		return 'Không có quyền chấm công';
	}

	const isManager = userRole === 'manager';

	if (!isManager && logDate !== todayVN) {
		return 'Lễ tân chỉ được chấm công ngày hôm nay';
	}

	return null;
}
