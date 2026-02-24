import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	realtimeStatusStore,
	offlineQueueCountStore,
	offlineSyncErrorStore,
	setBrowserOnlineStatus,
	setRealtimeSubscriptionConnected,
	markRealtimeActivity,
	setOfflineQueueCount,
	setOfflineSyncError,
	clearOfflineSyncError
} from './realtimeStatus';

describe('realtimeStatusStore', () => {
	beforeEach(() => {
		setRealtimeSubscriptionConnected(false);
		setBrowserOnlineStatus(true);
		realtimeStatusStore.set({ connected: false, lastUpdate: null });
	});

	it('has correct initial state', () => {
		const state = get(realtimeStatusStore);
		expect(state).toEqual({ connected: false, lastUpdate: null });
	});

	it('updates connected state from subscription helper', () => {
		setRealtimeSubscriptionConnected(true);
		const state = get(realtimeStatusStore);
		expect(state.connected).toBe(true);
		expect(state.lastUpdate).not.toBeNull();
	});

	it('forces disconnected when browser offline even if realtime subscribes', () => {
		setBrowserOnlineStatus(false);
		setRealtimeSubscriptionConnected(true);
		const state = get(realtimeStatusStore);
		expect(state.connected).toBe(false);
	});

	it('marks disconnected immediately when browser goes offline', () => {
		setRealtimeSubscriptionConnected(true);
		setBrowserOnlineStatus(false);
		const state = get(realtimeStatusStore);
		expect(state.connected).toBe(false);
	});

	it('recomputes connected state when browser comes back online', () => {
		setRealtimeSubscriptionConnected(true);
		setBrowserOnlineStatus(false);
		setBrowserOnlineStatus(true);
		expect(get(realtimeStatusStore).connected).toBe(true);
	});

	it('marks live activity only when browser online', () => {
		markRealtimeActivity();
		expect(get(realtimeStatusStore).connected).toBe(true);

		setBrowserOnlineStatus(false);
		markRealtimeActivity();
		expect(get(realtimeStatusStore).connected).toBe(false);
	});
});

describe('offlineQueueCountStore', () => {
	beforeEach(() => {
		offlineQueueCountStore.set(0);
	});

	it('has initial count of 0', () => {
		expect(get(offlineQueueCountStore)).toBe(0);
	});

	it('clamps queue count to non-negative', () => {
		setOfflineQueueCount(-5);
		expect(get(offlineQueueCountStore)).toBe(0);
		setOfflineQueueCount(3);
		expect(get(offlineQueueCountStore)).toBe(3);
	});
});

describe('offlineSyncErrorStore', () => {
	beforeEach(() => {
		clearOfflineSyncError();
	});

	it('sets and clears sync error', () => {
		setOfflineSyncError('Đồng bộ thất bại');
		expect(get(offlineSyncErrorStore)).toEqual({ message: 'Đồng bộ thất bại' });
		clearOfflineSyncError();
		expect(get(offlineSyncErrorStore)).toBeNull();
	});
});
