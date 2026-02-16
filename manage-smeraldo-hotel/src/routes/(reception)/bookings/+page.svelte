<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Đặt phòng — Smeraldo Hotel</title>
</svelte:head>

<!-- Skip link -->
<a href="#main-bookings" class="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-2">
	Bỏ qua điều hướng
</a>

<div id="main-bookings" class="mx-auto max-w-7xl px-4 py-6">
	<!-- Success banner (shown after redirect from new booking form) -->
	{#if data.created}
		<div
			class="mb-5 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3"
			role="status"
			aria-live="polite"
		>
			<span class="text-green-600" aria-hidden="true">✓</span>
			<p class="font-sans text-sm text-green-800">Đặt phòng đã được tạo thành công.</p>
		</div>
	{/if}

	<div class="mb-6 flex items-center justify-between">
		<h1 class="font-sans text-2xl font-bold text-gray-900">Đặt phòng</h1>
		<!-- eslint-disable svelte/no-navigation-without-resolve -->
		<a
			href="/bookings/new"
			class="rounded-lg bg-primary px-4 py-2 font-sans text-sm font-medium text-white transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 motion-reduce:transition-none"
		>
			+ Tạo đặt phòng mới
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	</div>

	<!-- Placeholder — full booking list in Story 3.4 -->
	{#if data.bookings.length === 0}
		<div class="rounded-lg border border-dashed border-gray-300 py-16 text-center">
			<p class="font-sans text-sm text-gray-500">Chưa có đặt phòng nào.</p>
			<!-- eslint-disable svelte/no-navigation-without-resolve -->
			<a
				href="/bookings/new"
				class="mt-4 inline-block font-sans text-sm font-medium text-primary underline underline-offset-2 hover:text-primary/80"
			>
				Tạo đặt phòng đầu tiên
			</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		</div>
	{/if}
</div>
