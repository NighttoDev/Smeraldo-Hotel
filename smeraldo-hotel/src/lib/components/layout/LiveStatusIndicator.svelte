<script lang="ts">
	import { realtimeStatusStore, offlineQueueCountStore } from '$lib/stores/realtimeStatus';
</script>

<div class="flex items-center gap-1">
	{#if $realtimeStatusStore.connected}
		<span class="h-2 w-2 rounded-full bg-green-500 animate-pulse motion-reduce:animate-none"></span>
		<span class="font-sans text-xs text-green-400">Trực tiếp</span>
	{:else}
		<span class="h-2 w-2 rounded-full bg-gray-400"></span>
		<span class="font-sans text-xs text-gray-400">Ngoại tuyến</span>
	{/if}
	{#if $offlineQueueCountStore > 0}
		<span class="font-sans text-xs text-yellow-400">({$offlineQueueCountStore})</span>
	{/if}
</div>
