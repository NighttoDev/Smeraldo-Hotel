<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod4 } from 'sveltekit-superforms/adapters';
	import { CheckOutSchema } from '$lib/db/schema';
	import { formatDateVN } from '$lib/utils/formatDate';
	import type { SuperValidated } from 'sveltekit-superforms';
	import type { CheckOut, BookingWithGuest } from '$lib/db/schema';

	interface Props {
		booking: BookingWithGuest | null;
		roomNumber: string;
		checkOutForm: SuperValidated<CheckOut>;
		onclose: () => void;
	}

	let { booking, roomNumber, checkOutForm, onclose }: Props = $props();

	let step = $state<1 | 2>(1);
	let showSuccessMessage = $state(false);

	const { form: formData, enhance, submitting, message, reset } = superForm(checkOutForm, {
		validators: zod4(CheckOutSchema),
		onUpdated: ({ form }) => {
			// FIX #4: Show success message before closing dialog
			if (form.message?.type === 'success') {
				showSuccessMessage = true;
				setTimeout(() => {
					showSuccessMessage = false;
					onclose();
				}, 1500); // Show success for 1.5s before closing
			}
		}
	});

	$effect(() => {
		if (booking) {
			step = 1;
			showSuccessMessage = false;
			reset({
				data: {
					booking_id: booking.id,
					room_id: booking.room_id
				},
				keepMessage: false
			});
		}
	});

	const sourceLabels: Record<string, string> = {
		agoda: 'Agoda',
		booking_com: 'Booking.com',
		trip_com: 'Trip.com',
		facebook: 'Facebook',
		walk_in: 'Khách vãng lai'
	};
</script>

<!-- FIX #3: Escape key handler for keyboard accessibility -->
<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape' && !$submitting && booking && !showSuccessMessage) {
			e.preventDefault();
			onclose();
		}
	}}
/>

{#if booking}
	<!-- Backdrop -->
	<button
		type="button"
		class="fixed inset-0 z-40 cursor-default bg-black/50"
		onclick={onclose}
		aria-label="Đóng hộp thoại"
		tabindex="-1"
		disabled={$submitting}
	></button>

	<!-- Dialog -->
	<div
		class="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl sm:inset-x-auto"
		role="dialog"
		aria-modal="true"
		aria-labelledby="checkout-title"
	>
		<h3 id="checkout-title" class="font-sans text-lg font-bold text-gray-900">
			Trả phòng {roomNumber}
		</h3>

		<!-- FIX #4: Success message with visual feedback -->
		{#if showSuccessMessage}
			<div
				class="mt-3 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 font-sans text-sm text-green-700"
				role="alert"
			>
				<svg class="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
					<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
				</svg>
				<span class="font-medium">Trả phòng thành công!</span>
			</div>
		{:else if $message}
			<div
				class="mt-3 rounded-lg px-3 py-2 font-sans text-sm {$message.type === 'error'
					? 'bg-red-50 text-red-700'
					: 'bg-green-50 text-green-700'}"
				role="alert"
			>
				{$message.text}
			</div>
		{/if}

		<form method="POST" action="?/checkOut" use:enhance class="mt-4 flex flex-col gap-4">
			<!-- Hidden fields -->
			<input type="hidden" name="booking_id" value={$formData.booking_id} />
			<input type="hidden" name="room_id" value={$formData.room_id} />

			{#if step === 1}
				<!-- Step 1: Booking details review -->
				<div class="flex flex-col gap-3">
					<div class="rounded-lg bg-gray-50 px-4 py-3">
						<p class="font-sans text-xs text-gray-500">Tên khách</p>
						<p class="font-sans text-sm font-medium text-gray-900">
							{booking.guest.full_name}
						</p>
					</div>

					<div class="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 px-4 py-3">
						<div>
							<p class="font-sans text-xs text-gray-500">Check-in</p>
							<p class="font-sans text-sm font-medium text-gray-900">
								{formatDateVN(booking.check_in_date)}
							</p>
						</div>
						<div>
							<p class="font-sans text-xs text-gray-500">Check-out</p>
							<p class="font-sans text-sm font-medium text-gray-900">
								{formatDateVN(booking.check_out_date)}
							</p>
						</div>
						<div>
							<p class="font-sans text-xs text-gray-500">Số đêm</p>
							<p class="font-sans text-sm font-medium text-gray-900">{booking.nights_count}</p>
						</div>
						<div>
							<p class="font-sans text-xs text-gray-500">Nguồn</p>
							<p class="font-sans text-sm font-medium text-gray-900">
								{booking.booking_source
									? (sourceLabels[booking.booking_source] ?? booking.booking_source)
									: '—'}
							</p>
						</div>
					</div>
				</div>

				<!-- Actions: Step 1 -->
				<div class="flex gap-3 pt-1">
					<button
						type="button"
						onclick={onclose}
						class="min-h-[48px] flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-sans text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 motion-reduce:transition-none"
						>
						Hủy
						</button>
						<button
						type="button"
						onclick={() => (step = 2)}
						class="min-h-[48px] flex-1 rounded-lg bg-primary px-4 py-2.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 motion-reduce:transition-none"
					>
						Xác nhận trả phòng
					</button>
				</div>
			{:else}
				<!-- Step 2: Destructive confirmation -->
				<div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
					<p class="font-sans text-sm font-medium text-red-800">
						Trả phòng {booking.guest.full_name} khỏi phòng {roomNumber}?
					</p>
					<p class="mt-1 font-sans text-xs text-red-600">
						Phòng sẽ chuyển sang trạng thái "Đang dọn" sau khi trả phòng.
					</p>
				</div>

				<!-- Actions: Step 2 -->
				<div class="flex gap-3 pt-1">
					<button
						type="button"
						onclick={() => (step = 1)}
						disabled={$submitting}
						class="min-h-[48px] flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-sans text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
						>
						Quay lại
						</button>
						<button
						type="submit"
						disabled={$submitting}
						class="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
					>
						{#if $submitting}
							<span
								class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent motion-reduce:animate-none"
								aria-hidden="true"
							></span>
							Đang xử lý...
						{:else}
							Có, trả phòng
						{/if}
					</button>
				</div>
			{/if}
		</form>
	</div>
{/if}
