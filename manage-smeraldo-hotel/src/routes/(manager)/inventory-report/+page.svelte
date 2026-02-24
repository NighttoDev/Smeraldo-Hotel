<script lang="ts">
	import MonthPicker from '$lib/components/attendance/MonthPicker.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Calculate totals for all numeric columns (except Current Stock)
	let totals = $derived.by(() => {
		const total = {
			opening_stock: 0,
			total_in: 0,
			total_out: 0,
			closing_stock: 0
		};

		for (const row of data.report) {
			total.opening_stock += row.opening_stock;
			total.total_in += row.total_in;
			total.total_out += row.total_out;
			total.closing_stock += row.closing_stock;
		}

		return total;
	});

	function stockDiffers(closingStock: number, currentStock: number): boolean {
		return closingStock !== currentStock;
	}
</script>

<svelte:head>
	<title>Báo cáo kho hàng — Smeraldo Hotel</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-6">
	<!-- Header with MonthPicker -->
	<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
		<h1 class="font-sans text-xl font-bold text-high-contrast">Báo cáo kho hàng</h1>
		<MonthPicker year={data.year} month={data.month} />
	</div>

	<!-- Report Table -->
	{#if data.report.length === 0}
		<div class="rounded-lg border border-gray-200 bg-white p-8 text-center">
			<p class="font-sans text-sm text-gray-500">Không có dữ liệu cho tháng này</p>
		</div>
	{:else}
		<div class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
			<table class="min-w-full border-collapse">
				<thead>
					<tr class="bg-gray-50">
						<th
							scope="col"
							class="sticky left-0 bg-gray-50 px-4 py-3 text-left font-sans text-xs font-semibold text-gray-600"
						>
							Sản phẩm
						</th>
						<th
							scope="col"
							class="px-4 py-3 text-right font-sans text-xs font-semibold text-gray-600"
						>
							Tồn đầu kỳ
						</th>
						<th
							scope="col"
							class="px-4 py-3 text-right font-sans text-xs font-semibold text-gray-600"
						>
							Nhập
						</th>
						<th
							scope="col"
							class="px-4 py-3 text-right font-sans text-xs font-semibold text-gray-600"
						>
							Xuất
						</th>
						<th
							scope="col"
							class="px-4 py-3 text-right font-sans text-xs font-semibold text-gray-600"
						>
							Tồn cuối kỳ
						</th>
						<th
							scope="col"
							class="px-4 py-3 text-right font-sans text-xs font-semibold text-gray-600"
						>
							Tồn hiện tại
						</th>
					</tr>
				</thead>
				<tbody>
					{#each data.report as row (row.item_id)}
						<tr class="border-b border-gray-100 hover:bg-gray-50/50">
							<th
								scope="row"
								class="sticky left-0 bg-white px-4 py-3 text-left font-sans text-sm font-medium text-gray-900"
							>
								{row.item_name}
							</th>
							<td class="px-4 py-3 text-right font-mono text-sm text-gray-900">
								{row.opening_stock}
							</td>
							<td class="px-4 py-3 text-right font-mono text-sm text-green-600 font-medium">
								{row.total_in}
							</td>
							<td class="px-4 py-3 text-right font-mono text-sm text-red-600 font-medium">
								{row.total_out}
							</td>
							<td class="px-4 py-3 text-right font-mono text-sm text-gray-900">
								{row.closing_stock}
							</td>
							<td
								class="px-4 py-3 text-right font-mono text-sm font-bold
									{stockDiffers(row.closing_stock, row.current_stock) ? 'bg-amber-50 text-amber-900' : 'text-gray-900'}"
							>
								{row.current_stock}
							</td>
						</tr>
					{/each}

					<!-- Totals Row -->
					<tr class="border-t-2 border-gray-300 bg-gray-50 font-semibold">
						<th
							scope="row"
							class="sticky left-0 bg-gray-50 px-4 py-3 text-left font-sans text-sm font-bold text-gray-900"
						>
							Tổng cộng
						</th>
						<td class="px-4 py-3 text-right font-mono text-sm font-bold text-gray-900">
							{totals.opening_stock}
						</td>
						<td class="px-4 py-3 text-right font-mono text-sm font-bold text-green-600">
							{totals.total_in}
						</td>
						<td class="px-4 py-3 text-right font-mono text-sm font-bold text-red-600">
							{totals.total_out}
						</td>
						<td class="px-4 py-3 text-right font-mono text-sm font-bold text-gray-900">
							{totals.closing_stock}
						</td>
						<td class="px-4 py-3 text-right font-mono text-sm text-gray-400">—</td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- Legend -->
		<div class="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
			<p class="font-sans text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
				Chú thích
			</p>
			<ul class="space-y-1 font-sans text-sm text-gray-600">
				<li class="flex items-center gap-2">
					<span class="inline-block h-3 w-3 rounded bg-amber-50 border border-amber-200"></span>
					<span
						>Tồn hiện tại khác tồn cuối kỳ — có hoạt động sau khi kết thúc tháng báo cáo</span
					>
				</li>
			</ul>
		</div>
	{/if}
</div>
