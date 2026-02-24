<script lang="ts">
	import AttendanceTable from '$lib/components/attendance/AttendanceTable.svelte';
	import MonthPicker from '$lib/components/attendance/MonthPicker.svelte';
	import { realtimeStatusStore } from '$lib/stores/realtimeStatus';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
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
