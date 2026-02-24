<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod4 } from 'sveltekit-superforms/adapters';
	import { StockOutFormSchema } from '$lib/db/schemas/inventory';
	import type { InventoryItemRow } from '$lib/types/inventory';
	import type { SuperValidated } from 'sveltekit-superforms';
	import type { StockOutFormData } from '$lib/db/schemas/inventory';
	import { enqueueOfflineAction } from '$lib/utils/offlineQueue';
	import { refreshOfflineQueueCount } from '$lib/utils/offlineSync';

	interface Props {
		data: SuperValidated<StockOutFormData>;
		items: InventoryItemRow[];
		onSuccess?: () => void;
		onOfflineQueued?: (payload: {
			item_id: string;
			quantity: number;
			recipient_name: string;
			notes: string | null;
		}) => void;
	}

	let { data, items, onSuccess, onOfflineQueued }: Props = $props();

	const { form, errors, enhance, message, submitting } = superForm(data, {
		validators: zod4(StockOutFormSchema),
		validationMethod: 'auto',
		resetForm: true,
		onResult: ({ result }) => {
			if (result.type === 'success' && onSuccess) {
				onSuccess();
			}
		}
	});

	async function handleOfflineSubmit(event: SubmitEvent): Promise<void> {
		if (typeof navigator === 'undefined' || navigator.onLine) return;
		event.preventDefault();
		if (!$form.item_id || !$form.quantity || !$form.recipient_name) return;

		await enqueueOfflineAction({
			action: 'inventory_stock_out',
			payload: {
				item_id: $form.item_id,
				quantity: Number($form.quantity),
				recipient_name: $form.recipient_name,
				notes: $form.notes || null
			}
		});
		await refreshOfflineQueueCount();
		onOfflineQueued?.({
			item_id: $form.item_id,
			quantity: Number($form.quantity),
			recipient_name: $form.recipient_name,
			notes: $form.notes || null
		});
		if (onSuccess) onSuccess();
		$form.item_id = '';
		$form.quantity = 0;
		$form.recipient_name = '';
		$form.notes = '';
	}

	// Get selected item for showing available stock
	let selectedItem = $derived(
		$form.item_id ? items.find((item) => item.id === $form.item_id) : null
	);
</script>

<form method="POST" action="?/stockOut" use:enhance onsubmit={handleOfflineSubmit} class="space-y-4">
	<!-- Item Selection -->
	<div>
		<label for="stock-out-item" class="block font-sans text-sm font-medium text-high-contrast">
			Vật tư <span class="text-red-500">*</span>
		</label>
		<select
			id="stock-out-item"
			name="item_id"
			bind:value={$form.item_id}
			class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-sans text-sm text-body-text shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
			aria-required="true"
			aria-invalid={$errors.item_id ? 'true' : undefined}
		>
			<option value="">-- Chọn vật tư --</option>
			{#each items as item (item.id)}
				<option value={item.id}>
					{item.name} ({item.unit}) — Tồn kho: {item.current_stock}
				</option>
			{/each}
		</select>
		{#if $errors.item_id}
			<p class="mt-1 font-sans text-xs text-red-600">{$errors.item_id}</p>
		{/if}
		{#if selectedItem}
			<p class="mt-1 font-sans text-xs text-gray-500">
				Hiện có: {selectedItem.current_stock} {selectedItem.unit}
			</p>
		{/if}
	</div>

	<!-- Quantity -->
	<div>
		<label for="stock-out-quantity" class="block font-sans text-sm font-medium text-high-contrast">
			Số lượng <span class="text-red-500">*</span>
		</label>
		<input
			type="number"
			id="stock-out-quantity"
			name="quantity"
			bind:value={$form.quantity}
			min="1"
			max={selectedItem?.current_stock}
			step="1"
			class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-sans text-sm text-body-text shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
			aria-required="true"
			aria-invalid={$errors.quantity ? 'true' : undefined}
		/>
		{#if $errors.quantity}
			<p class="mt-1 font-sans text-xs text-red-600">{$errors.quantity}</p>
		{/if}
	</div>

	<!-- Recipient Name -->
	<div>
		<label
			for="stock-out-recipient"
			class="block font-sans text-sm font-medium text-high-contrast"
		>
			Người nhận <span class="text-red-500">*</span>
		</label>
		<input
			type="text"
			id="stock-out-recipient"
			name="recipient_name"
			bind:value={$form.recipient_name}
			maxlength="100"
			class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-sans text-sm text-body-text shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
			placeholder="Tên khách hàng hoặc nhân viên"
			aria-required="true"
			aria-invalid={$errors.recipient_name ? 'true' : undefined}
		/>
		{#if $errors.recipient_name}
			<p class="mt-1 font-sans text-xs text-red-600">{$errors.recipient_name}</p>
		{/if}
	</div>

	<!-- Notes -->
	<div>
		<label for="stock-out-notes" class="block font-sans text-sm font-medium text-high-contrast">
			Ghi chú
		</label>
		<textarea
			id="stock-out-notes"
			name="notes"
			bind:value={$form.notes}
			rows="3"
			maxlength="500"
			class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-sans text-sm text-body-text shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
			placeholder="Xuất cho phòng 101..."
			aria-invalid={$errors.notes ? 'true' : undefined}
		></textarea>
		{#if $errors.notes}
			<p class="mt-1 font-sans text-xs text-red-600">{$errors.notes}</p>
		{/if}
	</div>

	<!-- Success/Error Messages -->
	{#if $message}
		<div
			class="rounded-lg border px-4 py-3 font-sans text-sm"
			class:border-green-200={!$message.startsWith('Lỗi') && !$message.startsWith('Không')}
			class:bg-green-50={!$message.startsWith('Lỗi') && !$message.startsWith('Không')}
			class:text-green-800={!$message.startsWith('Lỗi') && !$message.startsWith('Không')}
			class:border-red-200={$message.startsWith('Lỗi') || $message.startsWith('Không')}
			class:bg-red-50={$message.startsWith('Lỗi') || $message.startsWith('Không')}
			class:text-red-800={$message.startsWith('Lỗi') || $message.startsWith('Không')}
		>
			{$message}
		</div>
	{/if}

	<!-- Submit Button -->
	<button
		type="submit"
		disabled={$submitting}
		class="w-full rounded-md bg-primary px-4 py-2 font-sans text-sm font-medium text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
	>
		{$submitting ? 'Đang xuất kho...' : 'Xuất kho'}
	</button>
</form>
