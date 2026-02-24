<script lang="ts">
	import type { OccupancyReportData } from '$lib/types/reports';
	import { formatDate } from '$lib/utils/parseDate';

	let { reportData }: { reportData: OccupancyReportData } = $props();

	// Format percentage with 1 decimal place
	function formatPercentage(value: number): string {
		return value.toFixed(1) + '%';
	}
</script>

<!-- Summary Cards -->
<div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
	<!-- Total Room-Nights -->
	<div class="rounded-lg border border-gray-200 bg-white p-4">
		<p class="font-sans text-sm text-gray-600">Tổng phòng-đêm</p>
		<p class="mt-1 font-sans text-3xl font-bold text-gray-900">{reportData.totalRoomNights}</p>
		<p class="mt-1 font-sans text-xs text-gray-500">Tổng số phòng-đêm trong tháng</p>
	</div>

	<!-- Average Daily Occupancy -->
	<div class="rounded-lg border border-gray-200 bg-white p-4">
		<p class="font-sans text-sm text-gray-600">Trung bình lấp đầy</p>
		<p class="mt-1 font-sans text-3xl font-bold text-blue-600">
			{formatPercentage(reportData.avgDailyOccupancy)}
		</p>
		<p class="mt-1 font-sans text-xs text-gray-500">Tỷ lệ lấp đầy trung bình/ngày</p>
	</div>

	<!-- Peak Day -->
	<div class="rounded-lg border border-gray-200 bg-white p-4">
		<p class="font-sans text-sm text-gray-600">Ngày cao điểm</p>
		{#if reportData.peakDay}
			<p class="mt-1 font-sans text-3xl font-bold text-green-600">
				{reportData.peakDay.occupiedCount}
			</p>
			<p class="mt-1 font-sans text-xs text-gray-500">
				{formatDate(reportData.peakDay.date)} ({formatPercentage(reportData.peakDay.percentage)})
			</p>
		{:else}
			<p class="mt-1 font-sans text-3xl font-bold text-gray-400">—</p>
			<p class="mt-1 font-sans text-xs text-gray-500">Không có dữ liệu</p>
		{/if}
	</div>

	<!-- Quiet Day -->
	<div class="rounded-lg border border-gray-200 bg-white p-4">
		<p class="font-sans text-sm text-gray-600">Ngày thấp điểm</p>
		{#if reportData.quietDay}
			<p class="mt-1 font-sans text-3xl font-bold text-amber-600">
				{reportData.quietDay.occupiedCount}
			</p>
			<p class="mt-1 font-sans text-xs text-gray-500">
				{formatDate(reportData.quietDay.date)} ({formatPercentage(reportData.quietDay.percentage)})
			</p>
		{:else}
			<p class="mt-1 font-sans text-3xl font-bold text-gray-400">—</p>
			<p class="mt-1 font-sans text-xs text-gray-500">Không có dữ liệu</p>
		{/if}
	</div>
</div>

<!-- Daily Breakdown Table -->
<div class="overflow-x-auto rounded-lg border border-gray-200">
	<table class="min-w-full border-collapse">
		<caption class="sr-only">Breakdown chi tiết tỷ lệ lấp đầy theo ngày trong tháng</caption>
		<thead>
			<tr class="bg-gray-50">
				<th
					scope="col"
					class="px-4 py-3 text-left font-sans text-xs font-semibold text-gray-600"
				>
					Ngày
				</th>
				<th
					scope="col"
					class="px-4 py-3 text-right font-sans text-xs font-semibold text-gray-600"
				>
					Số phòng
				</th>
				<th
					scope="col"
					class="px-4 py-3 text-right font-sans text-xs font-semibold text-gray-600"
				>
					Tỷ lệ
				</th>
			</tr>
		</thead>
		<tbody>
			{#each reportData.dailyBreakdown as day, index (day.date)}
				<tr
					class="border-b border-gray-100 transition-colors hover:bg-gray-50/50 {index % 2 === 0
						? ''
						: 'bg-gray-50/30'}"
				>
					<td class="px-4 py-3 font-sans text-sm text-gray-900">
						{formatDate(day.date)}
					</td>
					<td class="px-4 py-3 text-right font-mono text-sm font-medium text-gray-900">
						{day.occupiedCount}
					</td>
					<td class="px-4 py-3 text-right font-sans text-sm">
						<span
							class="inline-flex items-center rounded-full px-2.5 py-0.5 font-sans text-xs font-medium {day.percentage >=
							70
								? 'bg-blue-100 text-blue-800'
								: day.percentage >= 40
									? 'bg-green-100 text-green-800'
									: day.percentage > 0
										? 'bg-amber-100 text-amber-800'
										: 'bg-gray-100 text-gray-600'}"
						>
							{day.occupiedCount} / {reportData.totalRooms} — {formatPercentage(day.percentage)}
						</span>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

{#if reportData.totalRoomNights === 0}
	<div class="mt-8 text-center">
		<p class="font-sans text-gray-500">Không có dữ liệu đặt phòng trong tháng này</p>
	</div>
{/if}

<style>
	/* Suppress transitions for users who prefer reduced motion */
	@media (prefers-reduced-motion: reduce) {
		tr {
			transition: none;
		}
	}
</style>
