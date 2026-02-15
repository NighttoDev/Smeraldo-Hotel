import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime } from './parseDate';

describe('formatDate', () => {
	it('formats a Date object to Vietnamese locale', () => {
		const result = formatDate(new Date(2026, 1, 15)); // Feb 15, 2026
		expect(result).toContain('15');
		expect(result).toContain('2');
		expect(result).toContain('2026');
	});

	it('formats an ISO string', () => {
		const result = formatDate('2026-02-15T14:30:00Z');
		expect(result).toContain('2026');
	});

	it('uses DD/MM/YYYY format (day before month)', () => {
		// March 5, 2026 — day=5, month=3
		const result = formatDate(new Date(2026, 2, 5));
		// In vi-VN, this should be 5/3/2026 or 05/03/2026
		expect(result).toMatch(/5.*3.*2026/);
	});
});

describe('formatDateTime', () => {
	it('includes time in the output', () => {
		const result = formatDateTime(new Date(2026, 1, 15, 14, 30));
		expect(result).toContain('14');
		expect(result).toContain('30');
	});

	it('formats an ISO string with time', () => {
		const result = formatDateTime('2026-02-15T14:30:00Z');
		expect(result).toContain('2026');
	});
});
