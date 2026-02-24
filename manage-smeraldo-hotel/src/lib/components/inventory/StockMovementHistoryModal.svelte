<script lang="ts">
	import type { StockMovementWithStaff } from '$lib/types/inventory';

	interface Props {
		itemName: string;
		movements: StockMovementWithStaff[];
		totalCount: number;
		currentPage: number;
		pageSize: number;
		onClose: () => void;
		onPageChange: (page: number) => void;
	}

	let { itemName, movements, totalCount, currentPage, pageSize, onClose, onPageChange }: Props =
		$props();

	let totalPages = $derived(Math.ceil(totalCount / pageSize));

	function formatDateTime(isoString: string): string {
		return new Intl.DateTimeFormat('vi-VN', {
			dateStyle: 'short',
			timeStyle: 'short'
		}).format(new Date(isoString));
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}

	function prevPage() {
		if (currentPage > 1) {
			onPageChange(currentPage - 1);
		}
	}

	function nextPage() {
		if (currentPage < totalPages) {
			onPageChange(currentPage + 1);
		}
	}
</script>

<!-- Modal backdrop -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
	onclick={handleBackdropClick}
>
	<!-- Modal content -->
	<div
		class="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl motion-reduce:transition-none"
	>
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
			<h2 class="font-sans text-lg font-semibold text-high-contrast">
				Lịch sử xuất nhập: {itemName}
			</h2>
			<button
				type="button"
				onclick={onClose}
				class="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 motion-reduce:transition-none"
				aria-label="Đóng"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
					class="h-5 w-5"
				>
					<path
						d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
					/>
				</svg>
			</button>
		</div>

		<!-- Content -->
		<div class="max-h-[60vh] overflow-y-auto px-6 py-4">
			{#if movements.length === 0}
				<p class="py-8 text-center font-sans text-sm text-gray-500">
					Chưa có lịch sử xuất nhập
				</p>
			{:else}
				<div class="overflow-x-auto">
					<table class="min-w-full border-collapse">
						<thead>
							<tr class="border-b border-gray-200">
								<th class="px-4 py-2 text-left font-sans text-xs font-semibold text-gray-600"
									>Ngày/Giờ</th
								>
								<th class="px-4 py-2 text-left font-sans text-xs font-semibold text-gray-600"
									>Loại</th
								>
								<th class="px-4 py-2 text-right font-sans text-xs font-semibold text-gray-600"
									>Số lượng</th
								>
								<th class="px-4 py-2 text-left font-sans text-xs font-semibold text-gray-600"
									>Người nhận</th
								>
								<th class="px-4 py-2 text-left font-sans text-xs font-semibold text-gray-600"
									>Ghi chú</th
								>
								<th class="px-4 py-2 text-left font-sans text-xs font-semibold text-gray-600"
									>Nhân viên</th
								>
							</tr>
						</thead>
						<tbody>
							{#each movements as movement (movement.id)}
								<tr class="border-b border-gray-100 hover:bg-gray-50">
									<td class="px-4 py-3 font-mono text-sm text-gray-900"
										>{formatDateTime(movement.created_at)}</td
									>
									<td class="px-4 py-3 font-sans text-sm">
										{#if movement.type === 'stock_in'}
											<span class="text-green-600">Nhập kho</span>
										{:else}
											<span class="text-red-600">Xuất kho</span>
										{/if}
									</td>
									<td class="px-4 py-3 text-right font-mono text-sm font-medium text-gray-900"
										>{movement.quantity}</td
									>
									<td class="px-4 py-3 font-sans text-sm text-gray-600"
										>{movement.recipient_name || '—'}</td
									>
									<td class="px-4 py-3 font-sans text-sm text-gray-600"
										>{movement.notes || '—'}</td
									>
									<td class="px-4 py-3 font-sans text-sm text-gray-600">{movement.staff_name}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>

		<!-- Footer with pagination -->
		{#if totalPages > 1}
			<div class="flex items-center justify-between border-t border-gray-200 px-6 py-4">
				<p class="font-sans text-sm text-gray-600">
					Trang {currentPage} / {totalPages}
				</p>
				<div class="flex gap-2">
					<button
						type="button"
						onclick={prevPage}
						disabled={currentPage === 1}
						class="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-lg border border-gray-300 bg-white px-4 font-sans text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
						aria-label="Trang trước"
					>
						Trước
					</button>
					<button
						type="button"
						onclick={nextPage}
						disabled={currentPage >= totalPages}
						class="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-lg border border-gray-300 bg-white px-4 font-sans text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
						aria-label="Trang sau"
					>
						Sau
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
