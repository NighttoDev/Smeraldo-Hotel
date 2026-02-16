<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	interface Props {
		year: number;
		month: number;
	}

	let { year, month }: Props = $props();

	const monthNames = [
		'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
		'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
	];

	// Use Vietnam timezone for current month detection — consistent with server-side getTodayVN()
	const nowVN = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Ho_Chi_Minh',
		year: 'numeric',
		month: '2-digit'
	}).format(new Date());
	const currentYear = Number(nowVN.slice(0, 4));
	const currentMonth = Number(nowVN.slice(5, 7));

	// Disable next if at or after current month (prevents navigating into future)
	let isAtOrAfterCurrentMonth = $derived(
		year > currentYear || (year === currentYear && month >= currentMonth)
	);

	function navigate(newYear: number, newMonth: number) {
		// Preserve existing query params (e.g., filters added later)
		const params = new URLSearchParams($page.url.searchParams);
		params.set('year', String(newYear));
		params.set('month', String(newMonth));
		goto(`?${params.toString()}`, { invalidateAll: true });
	}

	function prevMonth() {
		if (month === 1) {
			navigate(year - 1, 12);
		} else {
			navigate(year, month - 1);
		}
	}

	function nextMonth() {
		if (isAtOrAfterCurrentMonth) return;
		if (month === 12) {
			navigate(year + 1, 1);
		} else {
			navigate(year, month + 1);
		}
	}
</script>

<div class="flex items-center gap-2">
	<button
		type="button"
		onclick={prevMonth}
		aria-label="Tháng trước"
		class="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50 motion-reduce:transition-none"
	>
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5">
			<path fill-rule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd" />
		</svg>
	</button>

	<span class="min-w-[140px] text-center font-sans text-sm font-semibold text-gray-900">
		{monthNames[month - 1]}, {year}
	</span>

	<button
		type="button"
		onclick={nextMonth}
		disabled={isAtOrAfterCurrentMonth}
		aria-label="Tháng sau"
		class="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50 motion-reduce:transition-none
			{isAtOrAfterCurrentMonth ? 'cursor-not-allowed opacity-30' : ''}"
	>
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5">
			<path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
		</svg>
	</button>
</div>
