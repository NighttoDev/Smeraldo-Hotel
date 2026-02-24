<script lang="ts">
	import { navigating } from '$app/stores';
	import MonthPicker from '$lib/components/shared/MonthPicker.svelte';
	import OccupancyReportTable from '$lib/components/reports/OccupancyReportTable.svelte';
	import AttendanceSummary from '$lib/components/reports/AttendanceSummary.svelte';
	import InventorySummary from '$lib/components/reports/InventorySummary.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let activeTab = $state('occupancy');

	// Loading state during navigation
	let isNavigating = $derived($navigating !== null);
</script>

<svelte:head>
	<title>Báo cáo - Smeraldo Hotel</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-6">
	<!-- Page Header -->
	<div class="mb-6">
		<h1 class="font-sans text-2xl font-bold text-gray-900">Báo cáo</h1>
		<p class="mt-1 font-sans text-sm text-gray-600">
			Xem báo cáo lấp đầy, chấm công và kho hàng
		</p>
	</div>

	<!-- Tab Navigation -->
	<div
		role="tablist"
		class="mb-6 border-b border-gray-200"
		aria-label="Loại báo cáo"
	>
		<div class="flex gap-1">
			<button
				role="tab"
				aria-selected={activeTab === 'occupancy'}
				aria-controls="occupancy-panel"
				class="rounded-t-lg border-b-2 px-4 py-3 font-sans text-sm font-medium transition-colors {activeTab ===
				'occupancy'
					? 'border-amber-500 text-amber-600'
					: 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900'}"
				onclick={() => (activeTab = 'occupancy')}
			>
				Tỷ lệ lấp đầy
			</button>
			<button
				id="attendance-tab-button"
				role="tab"
				aria-selected={activeTab === 'attendance'}
				aria-controls="attendance-panel"
				class="rounded-t-lg border-b-2 px-4 py-3 font-sans text-sm font-medium transition-colors {activeTab ===
				'attendance'
					? 'border-amber-500 text-amber-600'
					: 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900'}"
				onclick={() => (activeTab = 'attendance')}
			>
				Chấm công
			</button>
			<button
				id="inventory-tab-button"
				role="tab"
				aria-selected={activeTab === 'inventory'}
				aria-controls="inventory-panel"
				class="rounded-t-lg border-b-2 px-4 py-3 font-sans text-sm font-medium transition-colors {activeTab ===
				'inventory'
					? 'border-amber-500 text-amber-600'
					: 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900'}"
				onclick={() => (activeTab = 'inventory')}
			>
				Kho
			</button>
		</div>
	</div>

	<!-- Month Picker -->
	<div class="mb-6">
		<MonthPicker selectedYear={data.selectedYear} selectedMonth={data.selectedMonth} />
	</div>

	<!-- Loading Overlay -->
	{#if isNavigating}
		<div class="mb-6 rounded-lg border border-gray-200 bg-white p-8 text-center">
			<div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
			<p class="mt-2 font-sans text-sm text-gray-600">Đang tải báo cáo...</p>
		</div>
	{/if}

	<!-- Tab Content -->
	<div
		id="occupancy-panel"
		role="tabpanel"
		aria-labelledby="occupancy-tab"
		hidden={activeTab !== 'occupancy'}
	>
		{#if activeTab === 'occupancy'}
			<OccupancyReportTable reportData={data.occupancyReport} />
		{/if}
	</div>

	<div
		id="attendance-panel"
		role="tabpanel"
		aria-labelledby="attendance-tab-button"
		hidden={activeTab !== 'attendance'}
	>
		{#if activeTab === 'attendance'}
			<AttendanceSummary
				reportData={data.attendanceReport}
				selectedYear={data.selectedYear}
				selectedMonth={data.selectedMonth}
			/>
		{/if}
	</div>

	<div
		id="inventory-panel"
		role="tabpanel"
		aria-labelledby="inventory-tab-button"
		hidden={activeTab !== 'inventory'}
	>
		{#if activeTab === 'inventory'}
			<InventorySummary reportData={data.inventoryReport} />
		{/if}
	</div>
</div>

<style>
	/* Suppress animations for users who prefer reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.animate-spin {
			animation: none;
		}

		button {
			transition: none;
		}
	}
</style>
