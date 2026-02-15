<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { invalidateAll } from '$app/navigation';
	import HousekeepingRoomCard from '$lib/components/rooms/HousekeepingRoomCard.svelte';
	import { initRoomState, roomListStore } from '$lib/stores/roomState';
	import type { RoomState } from '$lib/stores/roomState';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	$effect(() => {
		initRoomState(data.rooms as RoomState[]);
	});

	let rooms = $derived(
		$roomListStore.filter((r) => r.status === 'checking_out_today' || r.status === 'being_cleaned')
	);

	const initialForm = data.markReadyForm;
	const { form, enhance, submitting, message } = superForm(initialForm, {
		onUpdated({ form }) {
			if (form.message?.type === 'success') {
				loadingRoomId = null;
				invalidateAll();
			}
		}
	});

	let loadingRoomId = $state<string | null>(null);

	function handleMarkReady(roomId: string) {
		loadingRoomId = roomId;
		$form.room_id = roomId;
		const formEl = document.getElementById('mark-ready-form') as HTMLFormElement;
		formEl?.requestSubmit();
	}
</script>

<svelte:head>
	<title>Phòng của tôi — Smeraldo Hotel</title>
</svelte:head>

<div class="mx-auto max-w-lg px-4 py-6">
	<h1 class="mb-1 font-sans text-xl font-bold text-high-contrast">Phòng cần dọn</h1>
	<p class="mb-6 font-sans text-sm text-gray-500">
		{rooms.length} phòng đang chờ
	</p>

	<!-- Success/error message -->
	{#if $message}
		<div
			class="mb-4 rounded-md px-4 py-3 text-sm {$message.type === 'error'
				? 'border border-red-200 bg-red-50 text-red-700'
				: 'border border-green-200 bg-green-50 text-green-700'}"
			role="alert"
		>
			{$message.text}
		</div>
	{/if}

	<!-- Room cards -->
	{#if rooms.length === 0}
		<div class="rounded-lg border border-gray-200 bg-white px-6 py-12 text-center">
			<p class="font-sans text-sm text-gray-500">Không có phòng nào cần dọn.</p>
			<p class="mt-1 font-sans text-xs text-gray-400">Tuyệt vời! 🎉</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each rooms as room (room.id)}
				<HousekeepingRoomCard
					{room}
					onmarkready={handleMarkReady}
					loading={$submitting && loadingRoomId === room.id}
				/>
			{/each}
		</div>
	{/if}
</div>

<!-- Hidden form -->
<form id="mark-ready-form" method="POST" action="?/markReady" use:enhance class="hidden">
	<input type="hidden" name="room_id" bind:value={$form.room_id} />
</form>
