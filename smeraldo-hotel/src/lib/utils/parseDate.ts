/**
 * Format a Date or ISO string for display in Vietnamese locale.
 * Always use Intl.DateTimeFormat — never hardcode format strings.
 * DB/API stores dates as ISO 8601 strings.
 *
 * @param date - Date object or ISO 8601 string
 * @returns Formatted date string in DD/MM/YYYY (e.g., "15/02/2026")
 */
export function formatDate(date: Date | string): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	return new Intl.DateTimeFormat('vi-VN').format(d);
}

/**
 * Format a Date or ISO string with time in Vietnamese locale.
 *
 * @param date - Date object or ISO 8601 string
 * @returns Formatted date+time string (e.g., "15/02/2026, 14:30")
 */
export function formatDateTime(date: Date | string): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	return new Intl.DateTimeFormat('vi-VN', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	}).format(d);
}
