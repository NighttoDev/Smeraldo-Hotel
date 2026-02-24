<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import AttendanceTable from '$lib/components/attendance/AttendanceTable.svelte';
	import MonthPicker from '$lib/components/attendance/MonthPicker.svelte';
	import ShiftStatusIndicator from '$lib/components/attendance/ShiftStatusIndicator.svelte';
	import StartShiftButton from '$lib/components/attendance/StartShiftButton.svelte';
	import EndShiftDialog from '$lib/components/attendance/EndShiftDialog.svelte';
	import { realtimeStatusStore } from '$lib/stores/realtimeStatus';
	import { startShiftTimer } from '$lib/utils/shift-timer';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Shift UI state
	let endShiftDialogOpen = $state(false);
	let shiftTimerCleanup: (() => void) | null = null;

	// Get current user info from server data
	const currentUser = $derived(
		data.currentStaffMember
			? { id: data.currentStaffMember.id, name: data.currentStaffMember.full_name }
			: null
	);

	// Check if user has active shift
	const hasActiveShift = $derived(!!data.activeShift);

	// Auto-logout handler when shift expires (12 hours)
	function handleShiftExpired() {
		// Auto end shift by opening dialog
		endShiftDialogOpen = true;

		// Optional: Show notification
		if ('Notification' in window && Notification.permission === 'granted') {
			new Notification('Ca làm việc đã hết hạn', {
				body: 'Ca làm việc của bạn đã vượt quá 12 giờ. Vui lòng kết thúc ca.',
				icon: '/favicon.png'
			});
		}
	}

	// Set up shift timer on mount
	onMount(() => {
		if (data.activeShift?.shift_started_at) {
			shiftTimerCleanup = startShiftTimer({
				shiftStartTime: data.activeShift.shift_started_at,
				onExpire: handleShiftExpired
			});
		}

		// Request notification permission (optional)
		if ('Notification' in window && Notification.permission === 'default') {
			Notification.requestPermission();
		}
	});

	// Clean up timer on destroy
	onDestroy(() => {
		if (shiftTimerCleanup) {
			shiftTimerCleanup();
		}
	});

	// Watch for shift changes and restart timer
	$effect(() => {
		// Clean up existing timer
		if (shiftTimerCleanup) {
			shiftTimerCleanup();
			shiftTimerCleanup = null;
		}

		// Start new timer if shift active
		if (data.activeShift?.shift_started_at) {
			shiftTimerCleanup = startShiftTimer({
				shiftStartTime: data.activeShift.shift_started_at,
				onExpire: handleShiftExpired
			});
		}
	});

	function openEndShiftDialog() {
		endShiftDialogOpen = true;
	}

	function closeEndShiftDialog() {
		endShiftDialogOpen = false;
	}
</script>

<svelte:head>
	<title>Chấm công — Smeraldo Hotel</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-6">
	<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
		<div>
			<h1 class="font-sans text-xl font-bold text-high-contrast">Chấm công</h1>
			<p class="mt-1 font-sans text-sm text-gray-500">
				{data.staff.length} nhân viên
			</p>
			{#if data.role === 'manager'}
				<p class="mt-0.5 font-sans text-xs text-blue-600">
					Bạn có thể chỉnh sửa chấm công mọi ngày
				</p>
			{/if}
		</div>
		<MonthPicker year={data.year} month={data.month} />
	</div>

	{#if !$realtimeStatusStore.connected}
		<div class="mb-4 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-sans text-sm text-gray-700">
			Ngoại tuyến — đang hiển thị dữ liệu đã đồng bộ gần nhất
		</div>
	{/if}

	<!-- Shift Status Section (for reception and manager) -->
	{#if (data.role === 'reception' || data.role === 'manager') && currentUser}
		<div class="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<h2 class="mb-3 font-sans text-base font-semibold text-gray-900">Ca làm việc</h2>

			{#if hasActiveShift}
				<!-- Active Shift -->
				<div class="space-y-3">
					<ShiftStatusIndicator
						shiftStartedAt={data.activeShift?.shift_started_at ?? null}
						staffName={currentUser.name}
						onShiftExpired={handleShiftExpired}
					/>

					<div class="flex justify-end">
						<button
							type="button"
							onclick={openEndShiftDialog}
							class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
							</svg>
							Kết thúc ca
						</button>
					</div>
				</div>
			{:else}
				<!-- No Active Shift -->
				<div class="flex items-center justify-between gap-4">
					<p class="font-sans text-sm text-gray-600">
						Chưa bắt đầu ca làm việc hôm nay
					</p>
					<StartShiftButton staffId={currentUser.id} disabled={false} />
				</div>
			{/if}
		</div>
	{/if}

	{#if data.staff.length === 0}
		<!-- Skeleton / empty state -->
		<div class="rounded-lg border border-gray-200 p-8 text-center">
			<p class="font-sans text-sm text-gray-500">Không có nhân viên nào.</p>
		</div>
	{:else}
		<AttendanceTable
			staff={data.staff}
			logs={data.logs}
			year={data.year}
			month={data.month}
			userRole={data.role ?? ''}
			todayVN={data.todayVN}
		/>
	{/if}
</div>

<!-- End Shift Dialog -->
{#if currentUser && hasActiveShift}
	<EndShiftDialog
		bind:open={endShiftDialogOpen}
		shiftStartedAt={data.activeShift?.shift_started_at ?? null}
		staffName={currentUser.name}
		onClose={closeEndShiftDialog}
	/>
{/if}
