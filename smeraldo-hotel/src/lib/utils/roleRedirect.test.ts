import { describe, it, expect } from 'vitest';
import { getRoleHomePath } from './roleRedirect';

describe('getRoleHomePath', () => {
	it('returns /dashboard for manager', () => {
		expect(getRoleHomePath('manager')).toBe('/dashboard');
	});

	it('returns /rooms for reception', () => {
		expect(getRoleHomePath('reception')).toBe('/rooms');
	});

	it('returns /my-rooms for housekeeping', () => {
		expect(getRoleHomePath('housekeeping')).toBe('/my-rooms');
	});
});
