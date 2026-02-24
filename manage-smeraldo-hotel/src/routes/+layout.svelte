<script lang="ts">
	import '../app.css';
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { updateRoomInStore } from '$lib/stores/roomState';
	import type { RoomState } from '$lib/stores/roomState';
	import {
		markRealtimeActivity,
		setBrowserOnlineStatus,
		setRealtimeSubscriptionConnected
	} from '$lib/stores/realtimeStatus';
	import { flushOfflineQueue, refreshOfflineQueueCount } from '$lib/utils/offlineSync';
	import PushSubscriptionManager from '$lib/components/notifications/PushSubscriptionManager.svelte';
	import { updateRequestInStore, removeRequestFromStore } from '$lib/stores/override-requests-store';
	import type { OverrideRequest } from '$lib/stores/override-requests-store';

	let { data, children } = $props();
	let { supabase, session, userRole } = $derived(data);

	// Show push subscription prompt for reception and manager roles only
	const shouldShowPushPrompt = $derived(
		session !== null && (userRole === 'reception' || userRole === 'manager')
	);

	onMount(() => {
		setBrowserOnlineStatus(typeof navigator !== 'undefined' ? navigator.onLine : true);
		void refreshOfflineQueueCount();
		if (typeof navigator !== 'undefined' && navigator.onLine) {
			void flushOfflineQueue();
		}

		function handleBrowserOnline(): void {
			setBrowserOnlineStatus(true);
			void flushOfflineQueue();
		}

		function handleBrowserOffline(): void {
			setBrowserOnlineStatus(false);
			void refreshOfflineQueueCount();
		}

		window.addEventListener('online', handleBrowserOnline);
		window.addEventListener('offline', handleBrowserOffline);

		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((_event, newSession) => {
			if (newSession?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
		});

		const roomChannel = supabase
			.channel('rooms:all')
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'rooms' },
				(payload: { eventType: string; new: Record<string, unknown> }) => {
					if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
						const room = payload.new as unknown as RoomState;
						updateRoomInStore(room);
					}
					markRealtimeActivity();
				}
			)
			.subscribe((status: string) => {
				setRealtimeSubscriptionConnected(status === 'SUBSCRIBED');
			});

		// NEW: Subscribe to status override requests for manager approval workflow
		const overrideChannel = supabase
			.channel('override_requests:all')
			.on(
				'postgres_changes',
				{ event: 'INSERT', schema: 'public', table: 'status_override_requests' },
				(payload: { new: Record<string, unknown> }) => {
					const request = payload.new as unknown as OverrideRequest;
					updateRequestInStore(request);
					markRealtimeActivity();
				}
			)
			.on(
				'postgres_changes',
				{ event: 'UPDATE', schema: 'public', table: 'status_override_requests' },
				(payload: { new: Record<string, unknown> }) => {
					const request = payload.new as unknown as OverrideRequest;
					updateRequestInStore(request);
					markRealtimeActivity();
				}
			)
			.on(
				'postgres_changes',
				{ event: 'DELETE', schema: 'public', table: 'status_override_requests' },
				(payload: { old: Record<string, unknown> }) => {
					removeRequestFromStore(payload.old.id as string);
					markRealtimeActivity();
				}
			)
			.subscribe();

		return () => {
			window.removeEventListener('online', handleBrowserOnline);
			window.removeEventListener('offline', handleBrowserOffline);
			subscription.unsubscribe();
			roomChannel.unsubscribe();
			overrideChannel.unsubscribe();
		};
	});
</script>

<a
	href="#main-content"
	class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:font-sans focus:text-sm focus:font-medium focus:text-primary focus:shadow-lg focus:ring-2 focus:ring-primary"
>
	Bỏ qua điều hướng
</a>
{@render children()}

<!-- Push Notification Subscription Manager (Story 7.4) -->
<!-- Only shown to reception and manager roles -->
{#if shouldShowPushPrompt}
	<PushSubscriptionManager />
{/if}
