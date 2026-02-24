import { get, writable } from 'svelte/store';

export interface OfflineSyncError {
	message: string;
}

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

export const offlineQueueCountStore = writable<number>(0);
export const offlineSyncErrorStore = writable<OfflineSyncError | null>(null);

export function setOfflineQueueCount(count: number): void {
	offlineQueueCountStore.set(Math.max(0, count));
}

export function setOfflineSyncError(message: string): void {
	offlineSyncErrorStore.set({ message });
}

export function clearOfflineSyncError(): void {
	offlineSyncErrorStore.set(null);
}
