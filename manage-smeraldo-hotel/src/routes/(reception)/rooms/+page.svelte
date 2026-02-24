<script lang="ts">
	import { onMount } from 'svelte';
	import RoomGrid from '$lib/components/rooms/RoomGrid.svelte';
	import FloorFilter from '$lib/components/rooms/FloorFilter.svelte';
	import MonthlyCalendarView from '$lib/components/rooms/MonthlyCalendarView.svelte';
	import RoomStatusStrip from '$lib/components/rooms/RoomStatusStrip.svelte';
	import StatusOverrideRequestDialog from '$lib/components/rooms/StatusOverrideRequestDialog.svelte';
	import StatusOverrideApprovalList from '$lib/components/rooms/StatusOverrideApprovalList.svelte';
	import CheckInDialog from '$lib/components/bookings/CheckInDialog.svelte';
	import CheckOutDialog from '$lib/components/bookings/CheckOutDialog.svelte';
	import { initRoomState, roomListStore } from '$lib/stores/roomState';
	import type { RoomState, RoomStatus } from '$lib/stores/roomState';
	import { pendingRequestsStore } from '$lib/stores/override-requests-store';
	import type { BookingWithGuest } from '$lib/db/schema';
	import { realtimeStatusStore } from '$lib/stores/realtimeStatus';
	import type { PageData } from './$types';

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

	// Status override request dialog state (reception)
	let requestDialogOpen = $state(false);
	let requestDialogRoom = $state<{ id: string; number: string; status: RoomStatus } | null>(null);

	// Check-in dialog state
	let checkInBooking = $state<BookingWithGuest | null>(null);

	// Check-out dialog state
	let checkOutBooking = $state<BookingWithGuest | null>(null);
	let checkOutRoomNumber = $state('');

	// Read rooms from store for live Realtime updates
	let allRooms = $derived($roomListStore);
	let isOffline = $derived(!$realtimeStatusStore.connected);

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

	function handleRoomClick(roomId: string) {
		// Priority 1: Check-in (confirmed booking arriving today)
		const checkIn = data.todaysBookings.find((b) => b.room_id === roomId) ?? null;
		if (checkIn) {
			checkInBooking = checkIn;
			return;
		}
		// Priority 2: Check-out (occupied room with checked_in booking)
		const checkOut = data.occupiedBookings.find((b) => b.room_id === roomId) ?? null;
		if (checkOut) {
			const room = allRooms.find((r) => r.id === roomId);
			checkOutBooking = checkOut;
			checkOutRoomNumber = room?.room_number ?? '';
			return;
		}
		// Priority 3: Status override request (fallback)
		const room = allRooms.find((r) => r.id === roomId);
		if (room) {
			requestDialogRoom = {
				id: room.id,
				number: room.room_number,
				status: room.status
			};
			requestDialogOpen = true;
		}
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
		<!-- Manager: Override approval list -->
		{#if data.userRole === 'manager' && $pendingRequestsStore.length > 0}
			<div class="mb-6">
				<StatusOverrideApprovalList />
			</div>
		{/if}

		<!-- Floor filter -->
		<div class="mb-6">
			<FloorFilter {floors} selected={selectedFloor} onselect={(f) => (selectedFloor = f)} />
		</div>

		<!-- Room grid -->
		<RoomGrid rooms={filteredRooms} {isOffline} onroomclick={handleRoomClick} />
	{:else}
		{#if isOffline}
			<div class="mb-4 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-sans text-sm text-gray-700">
				Ngoại tuyến — đang hiển thị dữ liệu đã đồng bộ gần nhất
			</div>
		{/if}
		<MonthlyCalendarView rooms={allRooms} />
	{/if}
</div>

<!-- Override request dialog (reception) -->
{#if requestDialogRoom}
	<StatusOverrideRequestDialog
		bind:open={requestDialogOpen}
		roomId={requestDialogRoom.id}
		roomNumber={requestDialogRoom.number}
		currentStatus={requestDialogRoom.status}
		onClose={() => {
			requestDialogOpen = false;
			requestDialogRoom = null;
		}}
	/>
{/if}

<!-- Check-in dialog -->
<CheckInDialog
	booking={checkInBooking}
	checkInForm={data.checkInForm}
	onclose={() => (checkInBooking = null)}
/>

<!-- Check-out dialog -->
<CheckOutDialog
	booking={checkOutBooking}
	roomNumber={checkOutRoomNumber}
	checkOutForm={data.checkOutForm}
	onclose={() => (checkOutBooking = null)}
/>
