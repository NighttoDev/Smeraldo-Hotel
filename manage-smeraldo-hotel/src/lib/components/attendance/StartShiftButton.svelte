<script lang="ts">
/**
 * Start Shift Button
 *
 * Button to start a new shift. Triggers server action and shows loading state.
 */

import { enhance } from '$app/forms';
import type { SubmitFunction } from '@sveltejs/kit';

interface Props {
	/** Staff ID to start shift for */
	staffId: string;
	/** Whether button is disabled */
	disabled?: boolean;
	/** Custom class names */
	class?: string;
}

let { staffId, disabled = false, class: className = '' }: Props = $props();

let submitting = $state(false);

const handleSubmit: SubmitFunction = () => {
	submitting = true;

	return async ({ update }) => {
		await update();
		submitting = false;
	};
};
</script>

<form method="POST" action="?/startShift" use:enhance={handleSubmit}>
	<input type="hidden" name="staff_id" value={staffId} />
	<button
		type="submit"
		disabled={disabled || submitting}
		class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors {className}"
	>
		{#if submitting}
			<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
			</svg>
			Đang bắt đầu...
		{:else}
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
			</svg>
			Bắt đầu ca làm việc
		{/if}
	</button>
</form>
