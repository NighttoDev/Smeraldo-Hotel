<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import ShiftInput from './ShiftInput.svelte';
	import type { AttendanceWithStaff } from '$lib/types/attendance';

	interface StaffMember {
		id: string;
		full_name: string;
		role: string;
	}

	interface Props {
		staff: StaffMember[];
		logs: AttendanceWithStaff[];
		year: number;
		month: number;
		userRole: string;
		todayVN: string;
		onOfflineQueued?: (payload: {
			staff_id: string;
			log_date: string;
			shift_value: number;
		}) => void;
	}

	let { staff, logs, year, month, userRole, todayVN, onOfflineQueued }: Props = $props();

	// Build date list for the month
	let daysInMonth = $derived(new Date(year, month, 0).getDate());
	let dates = $derived(
		Array.from({ length: daysInMonth }, (_, i) => {
			const day = i + 1;
			return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
		})
	);

	// Build a lookup map: staffId -> { date -> shift_value }
	let attendanceMap = $derived.by(() => {
		const map = new SvelteMap<string, SvelteMap<string, number>>();
		for (const log of logs) {
			if (!map.has(log.staff_id)) {
				map.set(log.staff_id, new SvelteMap());
			}
			map.get(log.staff_id)!.set(log.log_date, log.shift_value);
		}
		return map;
	});

	function getShiftValue(staffId: string, date: string): number | null {
		return attendanceMap.get(staffId)?.get(date) ?? null;
	}

	function applyOptimisticAttendance(payload: {
		staff_id: string;
		log_date: string;
		shift_value: number;
	}): void {
		if (!attendanceMap.has(payload.staff_id)) {
			attendanceMap.set(payload.staff_id, new SvelteMap());
		}
		attendanceMap.get(payload.staff_id)?.set(payload.log_date, payload.shift_value);
		onOfflineQueued?.(payload);
	}

	function getTotal(staffId: string): number {
		const staffLogs = attendanceMap.get(staffId);
		if (!staffLogs) return 0;
		let total = 0;
		for (const v of staffLogs.values()) {
			total += v;
		}
		return total;
	}

	function formatDay(dateStr: string): string {
		const d = new Date(dateStr + 'T00:00:00');
		return String(d.getDate());
	}

	function formatDayOfWeek(dateStr: string): string {
		const d = new Date(dateStr + 'T00:00:00');
		const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
		return days[d.getDay()];
	}

	function isDisabled(date: string): boolean {
		if (userRole === 'manager') return false;
		return date !== todayVN;
	}
</script>

<div class="overflow-x-auto rounded-lg border border-gray-200">
	<table class="min-w-full border-collapse">
		<thead>
			<tr class="bg-gray-50">
				<th
					class="sticky left-0 z-10 min-w-[140px] border-b border-r border-gray-200 bg-gray-50 px-3 py-2 text-left font-sans text-xs font-semibold text-gray-600"
					scope="col"
				>
					Nhân viên
				</th>
				{#each dates as date (date)}
					<th
						class="min-w-[60px] border-b border-gray-200 px-1 py-2 text-center font-sans text-xs font-medium
							{date === todayVN ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : 'text-gray-500'}"
						scope="col"
					>
						<div>{formatDay(date)}</div>
						<div class="text-[10px] text-gray-500">{formatDayOfWeek(date)}</div>
					</th>
				{/each}
				<th
					class="sticky right-0 z-10 min-w-[70px] border-b border-l border-gray-200 bg-gray-50 px-3 py-2 text-center font-sans text-xs font-semibold text-gray-600"
					scope="col"
				>
					Tổng
				</th>
			</tr>
		</thead>
		<tbody>
			{#each staff as member (member.id)}
				<tr class="border-b border-gray-100 hover:bg-gray-50/50">
					<th
						scope="row"
						class="sticky left-0 z-10 border-r border-gray-200 bg-white px-3 py-2 text-left font-sans text-sm font-medium text-gray-900"
					>
						{member.full_name}
					</th>
					{#each dates as date (date)}
						<td
							class="px-1 py-1 text-center
								{date === todayVN ? 'bg-blue-50/50' : ''}"
						>
							<ShiftInput
								staffId={member.id}
								logDate={date}
								value={getShiftValue(member.id, date)}
								disabled={isDisabled(date)}
								onOfflineQueued={applyOptimisticAttendance}
							/>
						</td>
					{/each}
					<td
						class="sticky right-0 z-10 border-l border-gray-200 bg-blue-50 px-3 py-2 text-center font-mono text-sm font-bold text-gray-900"
					>
						{getTotal(member.id).toFixed(1)}
					</td>
					</tr>
					{/each}
					</tbody>
					</table>
					</div>
