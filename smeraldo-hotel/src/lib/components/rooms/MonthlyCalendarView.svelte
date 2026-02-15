<script lang="ts">
	type RoomStatus = 'available' | 'occupied' | 'checking_out_today' | 'being_cleaned' | 'ready';

	interface RoomState {
		id: string;
		room_number: string;
		floor: number;
		room_type: string;
		status: RoomStatus;
		current_guest_name: string | null;
	}

	interface Props {
		rooms: RoomState[];
	}

	let { rooms }: Props = $props();

	let currentMonth = $state(new Date());

	const dayHeaders = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

	let monthLabel = $derived(
		new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(currentMonth)
	);

	let calendarDays = $derived.by(() => {
		const year = currentMonth.getFullYear();
		const month = currentMonth.getMonth();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);

		let startDow = firstDay.getDay() - 1;
		if (startDow < 0) startDow = 6;

		const days: (number | null)[] = [];
		for (let i = 0; i < startDow; i++) days.push(null);
		for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
		while (days.length % 7 !== 0) days.push(null);

		return days;
	});

	let todayInfo = $derived.by(() => {
		const now = new Date();
		return {
			year: now.getFullYear(),
			month: now.getMonth(),
			day: now.getDate()
		};
	});

	function isToday(day: number): boolean {
		return (
			todayInfo.year === currentMonth.getFullYear() &&
			todayInfo.month === currentMonth.getMonth() &&
			todayInfo.day === day
		);
	}

	let statusSummary = $derived({
		occupied: rooms.filter((r) => r.status === 'occupied').length,
		available: rooms.filter((r) => r.status === 'available').length,
		total: rooms.length
	});

	function prevMonth() {
		currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
	}

	function nextMonth() {
		currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
	}
</script>

<div class="space-y-4">
	<!-- Month navigation -->
	<div class="flex items-center justify-between">
		<button
			type="button"
			onclick={prevMonth}
			class="min-h-[36px] rounded-full px-3 py-1.5 font-sans text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 motion-reduce:transition-none"
			aria-label="Tháng trước"
		>
			‹
		</button>
		<h2 class="font-sans text-lg font-semibold capitalize text-high-contrast">{monthLabel}</h2>
		<button
			type="button"
			onclick={nextMonth}
			class="min-h-[36px] rounded-full px-3 py-1.5 font-sans text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 motion-reduce:transition-none"
			aria-label="Tháng sau"
		>
			›
		</button>
	</div>

	<!-- Info note -->
	<p class="rounded-md border border-blue-200 bg-blue-50 px-4 py-2.5 font-sans text-sm text-blue-700">
		Hiển thị trạng thái phòng hiện tại. Lịch đặt phòng theo ngày sẽ có khi tính năng đặt phòng
		hoàn thành.
	</p>

	<!-- Occupancy summary -->
	<div class="flex flex-wrap items-center gap-x-4 gap-y-1 font-sans text-sm text-gray-600">
		<span class="inline-flex items-center gap-1.5">
			<span class="h-2 w-2 rounded-full bg-room-occupied"></span>
			<span class="font-medium">{statusSummary.occupied}</span>
			<span class="text-gray-400">Có khách</span>
		</span>
		<span class="inline-flex items-center gap-1.5">
			<span class="h-2 w-2 rounded-full bg-room-available"></span>
			<span class="font-medium">{statusSummary.available}</span>
			<span class="text-gray-400">Trống</span>
		</span>
		<span class="inline-flex items-center gap-1.5">
			<span class="font-medium">{statusSummary.total}</span>
			<span class="text-gray-400">Tổng phòng</span>
		</span>
	</div>

	<!-- Calendar grid -->
	<div class="overflow-hidden rounded-lg border border-gray-200">
		<!-- Day headers -->
		<div class="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
			{#each dayHeaders as header (header)}
				<div class="py-2 text-center font-sans text-xs font-semibold uppercase text-gray-500">
					{header}
				</div>
			{/each}
		</div>

		<!-- Date cells -->
		<div class="grid grid-cols-7">
			{#each calendarDays as day, i (i)}
				<div
					class="min-h-[48px] border-b border-r border-gray-100 p-2 text-center font-sans text-sm {day !== null && isToday(day) ? 'ring-2 ring-inset ring-primary bg-primary/5' : ''} {day === null ? 'bg-gray-50/50' : ''}"
				>
					{#if day !== null}
						<span class="font-medium text-gray-700">{day}</span>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>
