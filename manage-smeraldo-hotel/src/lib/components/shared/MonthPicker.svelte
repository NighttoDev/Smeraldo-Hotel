<script lang="ts">
	import { goto } from '$app/navigation';

	let { selectedYear, selectedMonth }: { selectedYear: number; selectedMonth: number } = $props();

	function changeMonth(delta: number) {
		let newMonth = selectedMonth + delta;
		let newYear = selectedYear;

		if (newMonth < 1) {
			newMonth = 12;
			newYear--;
		} else if (newMonth > 12) {
			newMonth = 1;
			newYear++;
		}

		// Disable future months (Vietnam timezone UTC+7)
		const now = new Date();
		const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
		const nowVN = new Date(now.getTime() + VN_OFFSET_MS);
		const currentYear = nowVN.getUTCFullYear();
		const currentMonth = nowVN.getUTCMonth() + 1;

		if (newYear > currentYear || (newYear === currentYear && newMonth > currentMonth)) {
			return; // Block future months
		}

		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(`?year=${newYear}&month=${newMonth}`, { replaceState: false, keepFocus: true });
	}

	let monthLabel = $derived(
		new Intl.DateTimeFormat('vi-VN', { year: 'numeric', month: 'long' }).format(
			new Date(selectedYear, selectedMonth - 1)
		)
	);

	// Check if we can go to previous/next month
	const now = new Date();
	const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
	const nowVN = new Date(now.getTime() + VN_OFFSET_MS);
	const currentYear = nowVN.getUTCFullYear();
	const currentMonth = nowVN.getUTCMonth() + 1;

	let canGoNext = $derived(
		selectedYear < currentYear || (selectedYear === currentYear && selectedMonth < currentMonth)
	);

	// Can always go back in time
	let canGoPrev = $derived(true);
</script>

<div class="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3">
	<button
		type="button"
		onclick={() => changeMonth(-1)}
		disabled={!canGoPrev}
		class="flex h-12 w-12 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
		aria-label="Tháng trước"
	>
		<span class="text-xl">←</span>
	</button>

	<span class="flex-1 text-center font-sans text-base font-medium text-gray-900">
		{monthLabel}
	</span>

	<button
		type="button"
		onclick={() => changeMonth(1)}
		disabled={!canGoNext}
		class="flex h-12 w-12 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
		aria-label="Tháng sau"
	>
		<span class="text-xl">→</span>
	</button>
</div>
