/**
 * Format an integer VND amount for display.
 * Always use Intl.NumberFormat — never hardcode format strings.
 * DB/API stores VND as integer (no decimals).
 *
 * @param amount - Integer VND amount (e.g., 1500000)
 * @returns Formatted string (e.g., "1.500.000 ₫")
 */
export function formatVND(amount: number): string {
	return new Intl.NumberFormat('vi-VN', {
		style: 'currency',
		currency: 'VND',
		maximumFractionDigits: 0
	}).format(amount);
}
