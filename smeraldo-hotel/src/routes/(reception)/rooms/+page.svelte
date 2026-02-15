<script lang="ts">
	import { onMount } from 'svelte';
	import { superForm } from 'sveltekit-superforms';
	import RoomGrid from '$lib/components/rooms/RoomGrid.svelte';
	import FloorFilter from '$lib/components/rooms/FloorFilter.svelte';
	import MonthlyCalendarView from '$lib/components/rooms/MonthlyCalendarView.svelte';
	import RoomStatusStrip from '$lib/components/rooms/RoomStatusStrip.svelte';
	import StatusOverrideDialog from '$lib/components/rooms/StatusOverrideDialog.svelte';
	import { initRoomState, roomListStore } from '$lib/stores/roomState';
	import type { RoomState } from '$lib/stores/roomState';
	import type { PageData } from './$types';

	type RoomStatus = 'available' | 'occupied' | 'checking_out_today' | 'being_cleaned' | 'ready';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Initialize store from server data
	onMount(() => {
		initRoomState(data.rooms as RoomState[]);
	});

	// Floor filter state
	let selectedFloor = $state<number | null>(null);

	// View toggle state
	let activeView = $state<'diagram' | 'calendar'>('diagram');

	// Override dialog state
	let selectedRoom = $state<RoomState | null>(null);

	// Read rooms from store for live Realtime updates
	let allRooms = $derived($roomListStore);

	// Filter by floor
	let filteredRooms = $derived(
		selectedFloor === null
			? allRooms
			: allRooms.filter((r) => r.floor === selectedFloor)
	);

	// Extract unique floors
	let floors = $derived(
		[...new Set(allRooms.map((r) => r.floor))].sort((a, b) => a - b)
	);

	// Status counts (from filtered rooms)
	let counts = $derived({
		available: filteredRooms.filter((r) => r.status === 'available').length,
		occupied: filteredRooms.filter((r) => r.status === 'occupied').length,
		checking_out_today: filteredRooms.filter((r) => r.status === 'checking_out_today').length,
		being_cleaned: filteredRooms.filter((r) => r.status === 'being_cleaned').length,
		ready: filteredRooms.filter((r) => r.status === 'ready').length
	});

	// Superform for override
	const initialForm = data.overrideForm;
	const { form, enhance, message } = superForm(initialForm, {
		onUpdated({ form }) {
			if (form.message?.type === 'success') {
				selectedRoom = null;
			}
		}
	});

	function handleRoomClick(roomId: string) {
		const room = allRooms.find((r) => r.id === roomId);
		if (room) {
			selectedRoom = room;
		}
	}

	function handleOverrideConfirm(roomId: string, newStatus: RoomStatus) {
		$form.room_id = roomId;
		$form.new_status = newStatus;
		const formEl = document.getElementById('override-form') as HTMLFormElement;
		formEl?.requestSubmit();
	}

	function handleOverrideCancel() {
		selectedRoom = null;
	}
</script>

<svelte:head>
	<title>Sơ đồ phòng — Smeraldo Hotel</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-6">
	<!-- Page header -->
	<div class="mb-4">
		<h1 class="font-sans text-xl font-bold text-high-contrast">Sơ đồ phòng</h1>
		<p class="mt-1 font-sans text-sm text-gray-500">
			{allRooms.length} phòng · {allRooms.filter((r) => r.status === 'occupied').length} có khách
		</p>
	</div>

	<!-- Status strip -->
	<div class="mb-4">
		<RoomStatusStrip {counts} />
	</div>

	<!-- View toggle -->
	<div class="mb-4 flex gap-2" role="group" aria-label="Chế độ xem">
		<button
			type="button"
			onclick={() => (activeView = 'diagram')}
			class="min-h-[48px] rounded-full px-4 py-1.5 font-sans text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 motion-reduce:transition-none {activeView === 'diagram' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
		>
			Sơ đồ
		</button>
		<button
			type="button"
			onclick={() => (activeView = 'calendar')}
			class="min-h-[48px] rounded-full px-4 py-1.5 font-sans text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 motion-reduce:transition-none {activeView === 'calendar' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
		>
			Lịch tháng
		</button>
	</div>

	{#if activeView === 'diagram'}
		<!-- Floor filter -->
		<div class="mb-6">
			<FloorFilter {floors} selected={selectedFloor} onselect={(f) => (selectedFloor = f)} />
		</div>

		<!-- Error/success message -->
		{#if $message}
			<div
				class="mb-4 rounded-md px-4 py-3 text-sm {$message.type === 'error' ? 'border border-red-200 bg-red-50 text-red-700' : 'border border-green-200 bg-green-50 text-green-700'}"
				role="alert"
			>
				{$message.text}
			</div>
		{/if}

		<!-- Room grid -->
		<RoomGrid rooms={filteredRooms} onroomclick={handleRoomClick} />
	{:else}
		<MonthlyCalendarView rooms={allRooms} />
	{/if}
</div>

<!-- Hidden form for status override -->
<form
	id="override-form"
	method="POST"
	action="?/overrideStatus"
	use:enhance
	class="hidden"
>
	<input type="hidden" name="room_id" bind:value={$form.room_id} />
	<input type="hidden" name="new_status" bind:value={$form.new_status} />
</form>

<!-- Override dialog -->
<StatusOverrideDialog
	room={selectedRoom}
	onconfirm={handleOverrideConfirm}
	oncancel={handleOverrideCancel}
/>
