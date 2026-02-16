<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	interface Props {
		staffId: string;
		logDate: string;
		value: number | null;
		disabled?: boolean;
	}

	let { staffId, logDate, value, disabled = false }: Props = $props();

	let submitting = $state(false);
	let localOverride = $state<number | null>(null);
	let displayValue = $derived(localOverride ?? value);

	const options = [
		{ value: 0, label: 'Nghỉ' },
		{ value: 0.5, label: 'Nửa ca' },
		{ value: 1, label: 'Cả ca' },
		{ value: 1.5, label: 'Tăng ca' }
	];

	function handleChange(newValue: number) {
		if (disabled || submitting) return;
		localOverride = newValue;
		submitting = true;
		const formEl = document.getElementById(`attendance-form-${staffId}-${logDate}`) as HTMLFormElement;
		formEl?.requestSubmit();
	}
</script>

<form
	id="attendance-form-{staffId}-{logDate}"
	method="POST"
	action="?/logAttendance"
	use:enhance={() => {
		return async ({ result }) => {
			submitting = false;
			if (result.type === 'success' || result.type === 'redirect') {
				await invalidateAll();
				localOverride = null;
			}
		};
	}}
	class="hidden"
>
	<input type="hidden" name="staff_id" value={staffId} />
	<input type="hidden" name="log_date" value={logDate} />
	<input type="hidden" name="shift_value" value={displayValue ?? ''} />
</form>

<div class="flex gap-0.5">
	{#each options as opt}
		<button
			type="button"
			onclick={() => handleChange(opt.value)}
			disabled={disabled || submitting}
			title={opt.label}
			class="min-h-[48px] min-w-[48px] rounded px-1.5 py-1 font-mono text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 motion-reduce:transition-none
				{displayValue === opt.value
					? 'bg-primary text-white ring-2 ring-primary/30'
					: 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
				{disabled ? 'cursor-not-allowed opacity-50' : ''}
				{submitting ? 'animate-pulse' : ''}"
		>
			{opt.value}
		</button>
	{/each}
</div>
