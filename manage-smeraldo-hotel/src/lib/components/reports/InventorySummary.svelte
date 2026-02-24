<script lang="ts">
	import type { InventorySummaryRow } from '$lib/types/inventory';

	let { reportData }: { reportData: InventorySummaryRow[] } = $props();

	function calculateNetChange(totalIn: number, totalOut: number): number {
		return (totalIn ?? 0) - (totalOut ?? 0);
	}

	function formatNetChange(value: number): string {
		return value >= 0 ? `+${value}` : `${value}`;
	}

	function isLowStock(currentStock: number, threshold: number): boolean {
		return currentStock <= threshold;
	}

	function isPostPeriodActivity(currentStock: number, closingStock: number): boolean {
		return currentStock !== closingStock;
	}
</script>

<div class="rounded-lg border border-gray-200 bg-white shadow-sm">
	{#if reportData.length === 0}
		<div class="py-12 text-center">
			<p class="font-sans text-sm text-gray-500">Không có dữ liệu kho hàng</p>
		</div>
	{:else}
		<!-- Table wrapper for horizontal scroll on mobile -->
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-gray-200 border-collapse">
				<caption class="sr-only">Báo cáo kho hàng tháng</caption>
				<thead class="bg-gray-50">
					<tr>
						<th
							scope="col"
							class="sticky left-0 z-10 bg-gray-50 px-6 py-3 text-left font-sans text-xs font-medium uppercase tracking-wider text-gray-700"
						>
							Tên sản phẩm
						</th>
						<th
							scope="col"
							class="px-6 py-3 text-right font-sans text-xs font-medium uppercase tracking-wider text-gray-700"
						>
							Tồn đầu kỳ
						</th>
						<th
							scope="col"
							class="px-6 py-3 text-right font-sans text-xs font-medium uppercase tracking-wider text-gray-700"
						>
							Nhập
						</th>
						<th
							scope="col"
							class="px-6 py-3 text-right font-sans text-xs font-medium uppercase tracking-wider text-gray-700"
						>
							Xuất
						</th>
						<th
							scope="col"
							class="px-6 py-3 text-right font-sans text-xs font-medium uppercase tracking-wider text-gray-700"
						>
							Tồn cuối kỳ
						</th>
						<th
							scope="col"
							class="px-6 py-3 text-right font-sans text-xs font-medium uppercase tracking-wider text-gray-700"
						>
							Tồn hiện tại
						</th>
						<th
							scope="col"
							class="px-6 py-3 text-right font-sans text-xs font-medium uppercase tracking-wider text-gray-700"
						>
							Thay đổi ròng
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white">
					{#each reportData as item (item.item_id)}
						<tr class="hover:bg-gray-50 transition-colors">
							<td
								class="sticky left-0 z-10 bg-white whitespace-nowrap px-6 py-4 font-sans text-sm font-medium text-gray-900"
							>
								{item.item_name}
								{#if isLowStock(item.current_stock, item.low_stock_threshold)}
									<span
										class="ml-2 inline-flex items-center rounded bg-red-100 px-2 py-1 font-sans text-xs font-medium text-red-800"
									>
										Tồn kho thấp
									</span>
								{/if}
							</td>
							<td class="whitespace-nowrap px-6 py-4 text-right font-sans text-sm text-gray-600">
								{item.opening_stock}
							</td>
							<td class="whitespace-nowrap px-6 py-4 text-right font-sans text-sm text-gray-600">
								{item.total_in}
							</td>
							<td class="whitespace-nowrap px-6 py-4 text-right font-sans text-sm text-gray-600">
								{item.total_out}
							</td>
							<td class="whitespace-nowrap px-6 py-4 text-right font-sans text-sm text-gray-600">
								{item.closing_stock}
							</td>
							<td
								class="whitespace-nowrap px-6 py-4 text-right font-sans text-sm font-medium {isPostPeriodActivity(
									item.current_stock,
									item.closing_stock
								)
									? 'bg-amber-50 text-amber-900'
									: 'text-gray-900'}"
							>
								{item.current_stock}
							</td>
							<td
								class="whitespace-nowrap px-6 py-4 text-right font-sans text-sm font-medium {calculateNetChange(
									item.total_in,
									item.total_out
								) >= 0
									? 'text-green-700'
									: 'text-red-700'}"
							>
								{formatNetChange(calculateNetChange(item.total_in, item.total_out))}
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
