import { writable } from 'svelte/store';

export interface RealtimeStatus {
	connected: boolean;
	lastUpdate: string | null;
}

export const realtimeStatusStore = writable<RealtimeStatus>({ connected: false, lastUpdate: null });

/** Placeholder for future offline queue integration (Story 7.3) */
export const offlineQueueCountStore = writable<number>(0);
