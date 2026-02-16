import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Test MonthPicker navigation logic (pure function tests)
// The actual component uses goto() for navigation, so we test the URL param generation and guard logic

describe('MonthPicker navigation logic', () => {
	// Pin system time to 2026-02-16 10:00 UTC (= 2026-02-16 17:00 VN)
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-02-16T10:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	function getNavigationParams(year: number, month: number, direction: 'prev' | 'next'): { year: number; month: number } {
		if (direction === 'prev') {
			if (month === 1) return { year: year - 1, month: 12 };
			return { year, month: month - 1 };
		}
		if (month === 12) return { year: year + 1, month: 1 };
		return { year, month: month + 1 };
	}

	function buildSearchParams(year: number, month: number): string {
		const params = new URLSearchParams();
		params.set('year', String(year));
		params.set('month', String(month));
		return params.toString();
	}

	function isAtOrAfterCurrentMonth(year: number, month: number): boolean {
		// Match component logic: use VN timezone
		const nowVN = new Intl.DateTimeFormat('en-CA', {
			timeZone: 'Asia/Ho_Chi_Minh',
			year: 'numeric',
			month: '2-digit'
		}).format(new Date());
		const currentYear = Number(nowVN.slice(0, 4));
		const currentMonth = Number(nowVN.slice(5, 7));
		return year > currentYear || (year === currentYear && month >= currentMonth);
	}

	describe('prevMonth navigation', () => {
		it('decrements month within same year', () => {
			const result = getNavigationParams(2026, 6, 'prev');
			expect(result).toEqual({ year: 2026, month: 5 });
		});

		it('wraps to December of previous year from January', () => {
			const result = getNavigationParams(2026, 1, 'prev');
			expect(result).toEqual({ year: 2025, month: 12 });
		});

		it('handles February correctly', () => {
			const result = getNavigationParams(2026, 2, 'prev');
			expect(result).toEqual({ year: 2026, month: 1 });
		});
	});

	describe('nextMonth navigation', () => {
		it('increments month within same year', () => {
			const result = getNavigationParams(2026, 6, 'next');
			expect(result).toEqual({ year: 2026, month: 7 });
		});

		it('wraps to January of next year from December', () => {
			const result = getNavigationParams(2026, 12, 'next');
			expect(result).toEqual({ year: 2027, month: 1 });
		});
	});

	describe('URL search params generation', () => {
		it('generates correct params for Feb 2026', () => {
			const params = buildSearchParams(2026, 2);
			expect(params).toBe('year=2026&month=2');
		});

		it('generates correct params for Dec 2025', () => {
			const params = buildSearchParams(2025, 12);
			expect(params).toBe('year=2025&month=12');
		});
	});

	describe('future month guard (VN timezone)', () => {
		it('returns true for current month (Feb 2026)', () => {
			expect(isAtOrAfterCurrentMonth(2026, 2)).toBe(true);
		});

		it('returns true for future month in same year', () => {
			expect(isAtOrAfterCurrentMonth(2026, 6)).toBe(true);
		});

		it('returns true for future year', () => {
			expect(isAtOrAfterCurrentMonth(2027, 1)).toBe(true);
		});

		it('returns false for past month', () => {
			expect(isAtOrAfterCurrentMonth(2026, 1)).toBe(false);
		});

		it('returns false for past year', () => {
			expect(isAtOrAfterCurrentMonth(2025, 12)).toBe(false);
		});
	});
});
