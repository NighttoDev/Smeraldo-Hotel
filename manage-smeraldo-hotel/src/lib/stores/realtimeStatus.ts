import { get, writable } from 'svelte/store';

export interface RealtimeStatus {
	connected: boolean;
	lastUpdate: string | null;
}

export const realtimeStatusStore = writable<RealtimeStatus>({ connected: false, lastUpdate: null });

let browserOnline = true;
let realtimeSubscribed = false;

export function setBrowserOnlineStatus(isOnline: boolean): void {
	browserOnline = isOnline;
	const previous = get(realtimeStatusStore);

	realtimeStatusStore.set({
		connected: browserOnline && realtimeSubscribed,
		lastUpdate: previous.lastUpdate
	});
}

export function setRealtimeSubscriptionConnected(isConnected: boolean): void {
	realtimeSubscribed = isConnected;
	const previous = get(realtimeStatusStore);
	realtimeStatusStore.set({
		connected: browserOnline && isConnected,
		lastUpdate: browserOnline && isConnected ? new Date().toISOString() : previous.lastUpdate
	});
}

export function markRealtimeActivity(): void {
	if (!browserOnline) return;

	realtimeStatusStore.set({
		connected: true,
		lastUpdate: new Date().toISOString()
	});
}

/** Placeholder for future offline queue integration (Story 7.3) */
export const offlineQueueCountStore = writable<number>(0);
