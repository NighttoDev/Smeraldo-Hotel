import { describe, it, expect } from 'vitest';
import { formatVND } from './formatVND';

describe('formatVND', () => {
	it('formats zero', () => {
		const result = formatVND(0);
		expect(result).toContain('0');
		expect(result).toContain('₫');
	});

	it('formats a typical amount with thousand separators', () => {
		const result = formatVND(1500000);
		expect(result).toContain('₫');
		// Locale may use '.' or ',' as thousands separator depending on ICU data
		expect(result).toMatch(/1[.,]500[.,]000/);
	});

	it('formats small amounts', () => {
		const result = formatVND(50000);
		expect(result).toContain('₫');
	});

	it('has no decimal places', () => {
		const result = formatVND(1500000);
		expect(result).not.toMatch(/\.\d{1,2}\s*₫/);
	});
});
