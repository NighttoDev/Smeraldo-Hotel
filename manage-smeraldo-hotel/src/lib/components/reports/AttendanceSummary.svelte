<script lang="ts">
	import type { AttendanceReportData } from '$lib/types/reports';

	let { reportData, selectedYear, selectedMonth }: {
		reportData: AttendanceReportData;
		selectedYear: number;
		selectedMonth: number;
	} = $props();

	// Derive days in month for column headers based on year/month
	let daysInMonth = $derived.by(() => {
		// Calculate number of days in the selected month
		const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
		return Array.from({ length: lastDay }, (_, i) => String(i + 1));
	});

	function formatShift(value: number | undefined): string {
		if (value === undefined) return '—';
		return value.toFixed(1);
	}

	function getShiftClass(value: number | undefined): string {
		if (value === undefined) return 'text-gray-400'; // Missing
		if (value === 1.0) return 'bg-blue-50 text-blue-900 font-medium'; // Full day
		if (value === 0.5) return 'bg-amber-50 text-amber-900 font-medium'; // Half day
		if (value === 0) return 'bg-red-50 text-red-900'; // Absent
		return '';
	}

	function getRoleLabel(role: string): string {
		const roleMap: Record<string, string> = {
			manager: 'Quản lý',
			reception: 'Lễ tân',
			housekeeping: 'Buồng phòng'
		};
		return roleMap[role] || role;
	}
</script>

<div class="rounded-lg border border-gray-200 bg-white shadow-sm">
	{#if reportData.staffSummary.length === 0}
		<div class="py-12 text-center">
			<p class="font-sans text-sm text-gray-500">Không có nhân viên nào</p>
		</div>
	{:else}
		<!-- Table wrapper for horizontal scroll on mobile -->
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-gray-200 border-collapse">
				<caption class="sr-only">Báo cáo chấm công tháng</caption>
				<thead class="bg-gray-50">
					<tr>
						<th
							scope="col"
							class="sticky left-0 z-10 bg-gray-50 px-6 py-3 text-left font-sans text-xs font-medium uppercase tracking-wider text-gray-700"
						>
							Tên nhân viên
						</th>
						<th
							scope="col"
							class="px-6 py-3 text-left font-sans text-xs font-medium uppercase tracking-wider text-gray-700"
						>
							Chức vụ
						</th>
						{#each daysInMonth as day (day)}
							<th
								scope="col"
								class="px-3 py-3 text-center font-sans text-xs font-medium uppercase tracking-wider text-gray-700"
							>
								{day}
							</th>
						{/each}
						<th
							scope="col"
							class="sticky right-0 z-10 bg-gray-50 px-6 py-3 text-right font-sans text-xs font-medium uppercase tracking-wider text-gray-700"
						>
							Tổng số ngày
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white">
					{#each reportData.staffSummary as staff (staff.staffId)}
						<tr class="hover:bg-gray-50 transition-colors">
							<td
								class="sticky left-0 z-10 bg-white whitespace-nowrap px-6 py-4 font-sans text-sm font-medium text-gray-900"
							>
								{staff.fullName}
							</td>
							<td class="whitespace-nowrap px-6 py-4 font-sans text-sm text-gray-600">
								{getRoleLabel(staff.role)}
							</td>
							{#each daysInMonth as day (day)}
								<td
									class="whitespace-nowrap px-3 py-4 text-center font-sans text-sm {getShiftClass(
										staff.dailyShifts.get(day)
									)}"
								>
									{formatShift(staff.dailyShifts.get(day))}
								</td>
							{/each}
							<td
								class="sticky right-0 z-10 bg-white whitespace-nowrap px-6 py-4 text-right font-sans text-sm font-bold text-gray-900"
							>
								{staff.totalDays.toFixed(1)} ngày
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	/* Suppress transitions for users who prefer reduced motion */
	@media (prefers-reduced-motion: reduce) {
		tr {
			transition: none;
		}
	}
</style>
