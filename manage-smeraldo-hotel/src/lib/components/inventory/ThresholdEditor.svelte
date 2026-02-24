<script lang="ts">
	import type { InventoryItemRow } from '$lib/types/inventory';
	import type { SuperValidated } from 'sveltekit-superforms';
	import type { UpdateThresholdFormData } from '$lib/db/schemas/inventory';
	import { superForm } from 'sveltekit-superforms';
	import { invalidateAll } from '$app/navigation';

	let {
		item,
		userRole,
		form: formData
	}: {
		item: InventoryItemRow;
		userRole: string;
		form: SuperValidated<UpdateThresholdFormData>;
	} = $props();

	let isEditing = $state(false);

	const { form, enhance, errors, message } = superForm(formData, {
		resetForm: false,
		onResult: ({ result }) => {
			if (result.type === 'success') {
				isEditing = false;
				invalidateAll(); // Refresh inventory list to re-evaluate low-stock badges
			}
		}
	});

	function startEditing() {
		$form.item_id = item.id;
		$form.threshold = item.low_stock_threshold;
		isEditing = true;
	}

	function cancelEditing() {
		isEditing = false;
	}
</script>

{#if userRole === 'manager'}
	{#if isEditing}
		<!-- Edit mode: number input + Save/Cancel -->
		<form method="POST" action="?/updateThreshold" use:enhance class="flex items-center gap-2">
			<input type="hidden" name="item_id" value={$form.item_id} />
			<input
				type="number"
				name="threshold"
				bind:value={$form.threshold}
				min="0"
				step="1"
				class="w-20 rounded border border-gray-300 px-2 py-1 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				aria-label="Ngưỡng sắp hết hàng"
			/>
			<div class="flex gap-1">
				<button
					type="submit"
					class="h-8 min-w-[48px] rounded bg-primary px-2 text-xs text-white hover:bg-primary/90"
					aria-label="Lưu ngưỡng"
				>
					Lưu
				</button>
				<button
					type="button"
					class="h-8 min-w-[48px] rounded px-2 text-xs text-gray-600 hover:bg-gray-100"
					onclick={cancelEditing}
					aria-label="Hủy"
				>
					Hủy
				</button>
			</div>
		</form>
		{#if $errors.threshold}
			<p class="mt-1 text-xs text-red-600">{$errors.threshold}</p>
		{/if}
		{#if $message}
			<p class="mt-1 text-xs text-green-600">{$message}</p>
		{/if}
	{:else}
		<!-- View mode: threshold value + edit icon -->
		<button
			type="button"
			onclick={startEditing}
			class="group flex items-center gap-2 rounded px-2 py-1 hover:bg-gray-100"
			aria-label="Chỉnh sửa ngưỡng"
		>
			<span class="font-mono">{item.low_stock_threshold}</span>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 20 20"
				fill="currentColor"
				class="h-4 w-4 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100"
			>
				<path
					d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z"
				/>
			</svg>
		</button>
	{/if}
{:else}
	<!-- Reception: read-only threshold value -->
	<span class="font-mono">{item.low_stock_threshold}</span>
{/if}
