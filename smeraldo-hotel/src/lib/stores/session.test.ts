import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import { sessionStore, updateSession, clearSession } from './session';

describe('sessionStore', () => {
	it('starts with null values', () => {
		const state = get(sessionStore);
		expect(state.user).toBeNull();
		expect(state.role).toBeNull();
		expect(state.fullName).toBeNull();
		expect(state.session).toBeNull();
	});

	it('updates session via updateSession()', () => {
		const mockSession = { access_token: 'test', expires_at: 9999 } as never;
		const mockUser = { id: 'user-1', email: 'test@example.com' } as never;

		updateSession(mockSession, mockUser, 'manager', 'Khoa Tran');

		const state = get(sessionStore);
		expect(state.session).toBe(mockSession);
		expect(state.user).toBe(mockUser);
		expect(state.role).toBe('manager');
		expect(state.fullName).toBe('Khoa Tran');
	});

	it('clears session via clearSession()', () => {
		// Set some data first
		updateSession(null, null, 'reception', 'Test User');
		clearSession();

		const state = get(sessionStore);
		expect(state.user).toBeNull();
		expect(state.role).toBeNull();
		expect(state.fullName).toBeNull();
		expect(state.session).toBeNull();
	});
});
