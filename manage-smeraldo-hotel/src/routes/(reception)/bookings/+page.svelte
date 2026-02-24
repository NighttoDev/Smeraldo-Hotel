<script lang="ts">
	import { formatDateVN } from '$lib/utils/formatDate';

	let { data } = $props();

	const sourceLabels: Record<string, string> = {
		agoda: 'Agoda',
		booking_com: 'Booking.com',
		trip_com: 'Trip.com',
		facebook: 'Facebook',
		walk_in: 'Khách vãng lai'
	};

	const statusLabels: Record<string, string> = {
		confirmed: 'Đã xác nhận',
		checked_in: 'Đã check-in',
		checked_out: 'Đã trả phòng',
		cancelled: 'Đã hủy'
	};
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
	{:else}
		<div class="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th scope="col" class="px-4 py-3 text-left font-sans text-xs font-semibold uppercase tracking-wide text-gray-600">Khách</th>
						<th scope="col" class="px-4 py-3 text-left font-sans text-xs font-semibold uppercase tracking-wide text-gray-600">Phòng</th>
						<th scope="col" class="px-4 py-3 text-left font-sans text-xs font-semibold uppercase tracking-wide text-gray-600">Ngày ở</th>
						<th scope="col" class="px-4 py-3 text-left font-sans text-xs font-semibold uppercase tracking-wide text-gray-600">Nguồn</th>
						<th scope="col" class="px-4 py-3 text-left font-sans text-xs font-semibold uppercase tracking-wide text-gray-600">Trạng thái</th>
						<th scope="col" class="px-4 py-3 text-right font-sans text-xs font-semibold uppercase tracking-wide text-gray-600">Chi tiết</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					{#each data.bookings as booking (booking.id)}
						<tr class="hover:bg-gray-50">
							<td class="px-4 py-3 font-sans text-sm text-gray-900">{booking.guest.full_name}</td>
							<td class="px-4 py-3 font-mono text-sm text-gray-700">F{booking.room.floor} — {booking.room.room_number}</td>
							<td class="px-4 py-3 font-sans text-sm text-gray-700">
								{formatDateVN(booking.check_in_date)} → {formatDateVN(booking.check_out_date)}
							</td>
							<td class="px-4 py-3 font-sans text-sm text-gray-700">
								{booking.booking_source ? (sourceLabels[booking.booking_source] ?? booking.booking_source) : '—'}
							</td>
							<td class="px-4 py-3">
								<span class="inline-flex rounded-full bg-gray-100 px-2.5 py-1 font-sans text-xs font-medium text-gray-700">
									{statusLabels[booking.status] ?? booking.status}
								</span>
							</td>
							<td class="px-4 py-3 text-right">
								<!-- eslint-disable svelte/no-navigation-without-resolve -->
								<a
									href={`/bookings/${booking.id}`}
									class="inline-flex min-h-[40px] items-center rounded-md border border-gray-300 px-3 py-1.5 font-sans text-xs font-medium text-gray-700 hover:bg-gray-100"
								>
									Mở
								</a>
								<!-- eslint-enable svelte/no-navigation-without-resolve -->
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
