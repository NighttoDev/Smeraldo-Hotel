<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod4 } from 'sveltekit-superforms/adapters';
	import { StockInFormSchema } from '$lib/db/schemas/inventory';
	import type { InventoryItemRow } from '$lib/types/inventory';
	import type { SuperValidated } from 'sveltekit-superforms';
	import type { StockInFormData } from '$lib/db/schemas/inventory';

	interface Props {
		data: SuperValidated<StockInFormData>;
		items: InventoryItemRow[];
		onSuccess?: () => void;
	}

	let { data, items, onSuccess }: Props = $props();

	const { form, errors, enhance, message, submitting } = superForm(data, {
		validators: zod4(StockInFormSchema),
		validationMethod: 'auto',
		resetForm: true,
		onResult: ({ result }) => {
			if (result.type === 'success' && onSuccess) {
				onSuccess();
			}
		}
	});
</script>

<form method="POST" action="?/stockIn" use:enhance class="space-y-4">
	<!-- Item Selection -->
	<div>
		<label for="stock-in-item" class="block font-sans text-sm font-medium text-high-contrast">
			Vật tư <span class="text-red-500">*</span>
		</label>
		<select
			id="stock-in-item"
			name="item_id"
			bind:value={$form.item_id}
			class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-sans text-sm text-body-text shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
			aria-required="true"
			aria-invalid={$errors.item_id ? 'true' : undefined}
		>
			<option value="">-- Chọn vật tư --</option>
			{#each items as item (item.id)}
				<option value={item.id}>{item.name} ({item.unit})</option>
			{/each}
		</select>
		{#if $errors.item_id}
			<p class="mt-1 font-sans text-xs text-red-600">{$errors.item_id}</p>
		{/if}
	</div>

	<!-- Quantity -->
	<div>
		<label for="stock-in-quantity" class="block font-sans text-sm font-medium text-high-contrast">
			Số lượng <span class="text-red-500">*</span>
		</label>
		<input
			type="number"
			id="stock-in-quantity"
			name="quantity"
			bind:value={$form.quantity}
			min="1"
			step="1"
			class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-sans text-sm text-body-text shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
			aria-required="true"
			aria-invalid={$errors.quantity ? 'true' : undefined}
		/>
		{#if $errors.quantity}
			<p class="mt-1 font-sans text-xs text-red-600">{$errors.quantity}</p>
		{/if}
	</div>

	<!-- Notes -->
	<div>
		<label for="stock-in-notes" class="block font-sans text-sm font-medium text-high-contrast">
			Ghi chú
		</label>
		<textarea
			id="stock-in-notes"
			name="notes"
			bind:value={$form.notes}
			rows="3"
			maxlength="500"
			class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-sans text-sm text-body-text shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
			placeholder="Nhập từ nhà cung cấp..."
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
			class:border-green-200={!$message.startsWith('Lỗi')}
			class:bg-green-50={!$message.startsWith('Lỗi')}
			class:text-green-800={!$message.startsWith('Lỗi')}
			class:border-red-200={$message.startsWith('Lỗi')}
			class:bg-red-50={$message.startsWith('Lỗi')}
			class:text-red-800={$message.startsWith('Lỗi')}
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
		{$submitting ? 'Đang nhập kho...' : 'Nhập kho'}
	</button>
</form>
