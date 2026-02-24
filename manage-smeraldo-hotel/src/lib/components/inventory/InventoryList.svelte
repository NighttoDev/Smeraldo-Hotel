<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import type { InventoryItemRow, StockMovementWithStaff } from '$lib/types/inventory';
	import type { SuperValidated } from 'sveltekit-superforms';
	import type { UpdateThresholdFormData } from '$lib/db/schemas/inventory';
	import ThresholdEditor from './ThresholdEditor.svelte';
	import StockMovementHistoryModal from './StockMovementHistoryModal.svelte';

	interface Props {
		items: InventoryItemRow[];
		userRole: string;
		thresholdForm: SuperValidated<UpdateThresholdFormData>;
	}

	let { items, userRole, thresholdForm }: Props = $props();

	function isLowStock(item: InventoryItemRow): boolean {
		return item.current_stock <= item.low_stock_threshold;
	}

	let groupedItems = $derived.by(() => {
		const groups = new SvelteMap<string, InventoryItemRow[]>();
		for (const item of items) {
			const existing = groups.get(item.category) ?? [];
			existing.push(item);
			groups.set(item.category, existing);
		}
		return groups;
	});

	// Modal state
	let showModal = $state(false);
	let selectedItem = $state<InventoryItemRow | null>(null);
	let movementHistory = $state<StockMovementWithStaff[]>([]);
	let totalMovements = $state(0);
	let currentPage = $state(1);
	const pageSize = 50;

	async function fetchMovementHistory(itemId: string, page: number) {
		try {
			const offset = (page - 1) * pageSize;
			const response = await fetch(
				`/api/inventory/movements?itemId=${itemId}&limit=${pageSize}&offset=${offset}`
			);
			if (!response.ok) {
				throw new Error('Failed to fetch movement history');
			}
			const result = await response.json();
			movementHistory = result.data?.movements || [];
			totalMovements = result.data?.total || 0;
		} catch (error) {
			console.error('Error fetching movement history:', error);
			movementHistory = [];
			totalMovements = 0;
		}
	}

	function handleRowClick(item: InventoryItemRow) {
		selectedItem = item;
		currentPage = 1;
		showModal = true;
		fetchMovementHistory(item.id, 1);
	}

	function handlePageChange(page: number) {
		if (selectedItem) {
			currentPage = page;
			fetchMovementHistory(selectedItem.id, page);
		}
	}

	function closeModal() {
		showModal = false;
		selectedItem = null;
		movementHistory = [];
		currentPage = 1;
	}
</script>

<!-- Desktop table (hidden on mobile) -->
<div class="hidden md:block">
	<div class="overflow-x-auto rounded-lg border border-gray-200">
		<table class="min-w-full border-collapse">
			<thead>
				<tr class="bg-gray-50">
					<th
						scope="col"
						class="px-4 py-3 text-left font-sans text-xs font-semibold text-gray-600"
					>
						Sản phẩm
					</th>
					<th
						scope="col"
						class="px-4 py-3 text-left font-sans text-xs font-semibold text-gray-600"
					>
						Danh mục
					</th>
					<th
						scope="col"
						class="px-4 py-3 text-right font-sans text-xs font-semibold text-gray-600"
					>
						Tồn kho
					</th>
					<th
						scope="col"
						class="px-4 py-3 text-left font-sans text-xs font-semibold text-gray-600"
					>
						Đơn vị
					</th>
					<th
						scope="col"
						class="px-4 py-3 text-right font-sans text-xs font-semibold text-gray-600"
					>
						Ngưỡng
					</th>
					<th
						scope="col"
						class="px-4 py-3 text-left font-sans text-xs font-semibold text-gray-600"
					>
						Trạng thái
					</th>
				</tr>
			</thead>
			<tbody>
				{#each items as item (item.id)}
					<tr
						class="cursor-pointer border-b border-gray-100 hover:bg-gray-50/50
							{isLowStock(item) ? 'bg-amber-50/50' : ''}"
						role="button"
						tabindex="0"
						onclick={() => handleRowClick(item)}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								handleRowClick(item);
							}
						}}
					>
						<th
							scope="row"
							class="px-4 py-3 text-left font-sans text-sm font-medium text-gray-900"
						>
							{item.name}
						</th>
						<td class="px-4 py-3 font-sans text-sm text-gray-500">
							{item.category}
						</td>
						<td class="px-4 py-3 text-right font-mono text-sm font-bold text-gray-900">
							{item.current_stock}
						</td>
						<td class="px-4 py-3 font-sans text-sm text-gray-500">
							{item.unit}
						</td>
						<td class="px-4 py-3 text-right">
							<ThresholdEditor {item} {userRole} form={thresholdForm} />
						</td>
						<td class="px-4 py-3">
							{#if isLowStock(item)}
								<span
									class="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 font-sans text-xs font-medium text-amber-800"
								>
									Sắp hết
								</span>
							{:else}
								<span
									class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 font-sans text-xs font-medium text-green-800"
								>
									Đủ hàng
								</span>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<!-- Mobile card layout (hidden on desktop) -->
<div class="space-y-4 md:hidden">
	{#each [...groupedItems] as [category, categoryItems] (category)}
		<div>
			<h2 class="mb-2 font-sans text-sm font-semibold text-gray-500 uppercase tracking-wide">
				{category}
			</h2>
			<div class="space-y-2">
				{#each categoryItems as item (item.id)}
					<div
						class="cursor-pointer rounded-lg border p-4
							{isLowStock(item) ? 'border-amber-300 bg-amber-50/50' : 'border-gray-200 bg-white'}"
						role="button"
						tabindex="0"
						onclick={() => handleRowClick(item)}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								handleRowClick(item);
							}
						}}
					>
						<div class="flex items-start justify-between">
							<div>
								<p class="font-sans text-sm font-medium text-gray-900">{item.name}</p>
								<div class="mt-0.5 flex items-center gap-1.5 font-sans text-xs text-gray-500">
									<span>{item.unit}</span>
									<span>·</span>
									<span>ngưỡng:</span>
									<ThresholdEditor {item} {userRole} form={thresholdForm} />
								</div>
							</div>
							<div class="text-right">
								<p class="font-mono text-2xl font-bold text-gray-900">
									{item.current_stock}
								</p>
								{#if isLowStock(item)}
									<span
										class="mt-1 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 font-sans text-xs font-medium text-amber-800"
									>
										Sắp hết
									</span>
								{:else}
									<span
										class="mt-1 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 font-sans text-xs font-medium text-green-800"
									>
										Đủ hàng
									</span>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/each}
</div>

<!-- Movement History Modal -->
{#if showModal && selectedItem}
	<StockMovementHistoryModal
		itemName={selectedItem.name}
		movements={movementHistory}
		totalCount={totalMovements}
		currentPage={currentPage}
		pageSize={pageSize}
		onClose={closeModal}
		onPageChange={handlePageChange}
	/>
{/if}
