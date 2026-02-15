// Current user + role store — cross-component state
import { writable } from 'svelte/store';
import type { Session, User } from '@supabase/supabase-js';

export type StaffRole = 'manager' | 'reception' | 'housekeeping';

export interface SessionData {
	user: User | null;
	role: StaffRole | null;
	fullName: string | null;
	session: Session | null;
}

const initialState: SessionData = {
	user: null,
	role: null,
	fullName: null,
	session: null
};

export const sessionStore = writable<SessionData>(initialState);

/** Update the session store with user and role information */
export function updateSession(
	session: Session | null,
	user: User | null,
	role: StaffRole | null,
	fullName: string | null = null
): void {
	sessionStore.set({ session, user, role, fullName });
}

/** Clear the session store (on logout) */
export function clearSession(): void {
	sessionStore.set(initialState);
}
