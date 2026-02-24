<script lang="ts">
	import {
		realtimeStatusStore,
		offlineQueueCountStore,
		offlineSyncErrorStore,
		clearOfflineSyncError
	} from '$lib/stores/realtimeStatus';
	import { retryFailedOfflineSync } from '$lib/utils/offlineSync';

	async function handleRetrySync(): Promise<void> {
		clearOfflineSyncError();
		await retryFailedOfflineSync();
	}
</script>

<div class="flex items-center gap-1">
	{#if $realtimeStatusStore.connected}
		<span class="h-2 w-2 animate-pulse rounded-full bg-green-500 motion-reduce:animate-none"></span>
		<span class="font-sans text-xs text-green-400">Trực tiếp · Vừa cập nhật</span>
	{:else}
		<span class="h-2 w-2 rounded-full bg-gray-400"></span>
		<span class="font-sans text-xs text-gray-400">
			Ngoại tuyến — {$offlineQueueCountStore} thay đổi đang chờ
		</span>
	{/if}
</div>

{#if $offlineSyncErrorStore}
	<button
		type="button"
		onclick={handleRetrySync}
		class="mt-2 rounded-md border border-red-300 bg-red-50 px-2 py-1 font-sans text-xs font-medium text-red-700"
	>
		{$offlineSyncErrorStore.message}
	</button>
{/if}
