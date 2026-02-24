<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod4 } from 'sveltekit-superforms/adapters';
	import GuestInput from '$lib/components/bookings/GuestInput.svelte';
	import { UpdateBookingFormSchema, CancelBookingSchema } from '$lib/db/schema';
	import { invalidateAll } from '$app/navigation';
	import { formatDateVN } from '$lib/utils/formatDate';

	let { data } = $props();

	let showCancelDialog = $state(false);
	let cancelStep = $state<1 | 2>(1);

	const sourceOptions = [
		{ value: 'agoda', label: 'Agoda' },
		{ value: 'booking_com', label: 'Booking.com' },
		{ value: 'trip_com', label: 'Trip.com' },
		{ value: 'facebook', label: 'Facebook' },
		{ value: 'walk_in', label: 'Khách vãng lai' }
	];

	const statusLabels: Record<string, string> = {
		confirmed: 'Đã xác nhận',
		checked_in: 'Đã check-in',
		checked_out: 'Đã trả phòng',
		cancelled: 'Đã hủy'
	};

	const {
		form: updateFormData,
		errors: updateErrors,
		enhance: enhanceUpdate,
		submitting: updateSubmitting,
		message: updateMessage
	} = superForm(data.updateForm, {
		validators: zod4(UpdateBookingFormSchema),
		validationMethod: 'onblur',
		onUpdated: async ({ form }) => {
			if (form.message?.type === 'success') {
				await invalidateAll();
			}
		}
	});

	const {
		form: cancelFormData,
		enhance: enhanceCancel,
		submitting: cancelSubmitting,
		message: cancelMessage,
		reset: resetCancel
	} = superForm(data.cancelForm, {
		validators: zod4(CancelBookingSchema),
		onUpdated: async ({ form }) => {
			if (form.message?.type === 'success') {
				showCancelDialog = false;
				cancelStep = 1;
				await invalidateAll();
			}
		}
	});

	let selectedRoom = $derived(data.rooms.find((room) => room.id === $updateFormData.room_id));
	let isApartment = $derived(
		selectedRoom ? selectedRoom.room_type.toLowerCase().includes('apartment') : false
	);

	function onRoomChange() {
		if (!isApartment) {
			$updateFormData.is_long_stay = false;
			$updateFormData.duration_days = undefined;
		}
	}

	function openCancelDialog() {
		cancelStep = 1;
		showCancelDialog = true;
		resetCancel({
			data: {
				booking_id: data.booking.id,
				room_id: data.booking.room_id,
				guest_name: data.booking.guest.full_name
			},
			keepMessage: false
		});
	}
</script>

<svelte:head>
	<title>Chi tiết đặt phòng — Smeraldo Hotel</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-6">
	<!-- eslint-disable svelte/no-navigation-without-resolve -->
	<a href="/bookings" class="mb-4 inline-flex items-center gap-1 font-sans text-sm text-gray-500 hover:text-gray-800">
		← Quay lại danh sách đặt phòng
	</a>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->

	<div class="mb-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div>
				<h1 class="font-sans text-xl font-bold text-gray-900">{data.booking.guest.full_name}</h1>
				<p class="mt-1 font-sans text-sm text-gray-500">
					F{data.booking.room.floor} — {data.booking.room.room_number} · {formatDateVN(data.booking.check_in_date)} →
					{formatDateVN(data.booking.check_out_date)}
				</p>
			</div>
			<span class="inline-flex rounded-full bg-gray-100 px-3 py-1 font-sans text-xs font-medium text-gray-700">
				{statusLabels[data.booking.status] ?? data.booking.status}
			</span>
		</div>
	</div>

	{#if $updateMessage}
		<div
			class="mb-4 rounded-lg px-4 py-3 font-sans text-sm {$updateMessage.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}"
			role="alert"
		>
			{$updateMessage.text}
		</div>
	{/if}

	<form method="POST" action="?/submit" use:enhanceUpdate class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
		<input type="hidden" name="booking_id" bind:value={$updateFormData.booking_id} />
		<input type="hidden" name="guest_id" bind:value={$updateFormData.guest_id} />

		<div class="grid gap-5">
			<GuestInput bind:value={$updateFormData.guest_name} error={$updateErrors.guest_name} />

			<div class="grid gap-4 sm:grid-cols-2">
				<div class="flex flex-col gap-1">
					<label for="room_id" class="font-sans text-sm font-medium text-gray-700">Phòng</label>
					<select
						id="room_id"
						name="room_id"
						bind:value={$updateFormData.room_id}
						onchange={onRoomChange}
						disabled={$updateSubmitting}
						class="h-12 rounded-lg border border-gray-300 px-3 font-sans text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:bg-gray-50"
					>
						{#each data.rooms as room (room.id)}
							<option value={room.id}>F{room.floor} — {room.room_number} ({room.room_type})</option>
						{/each}
					</select>
					{#if $updateErrors.room_id}
						<p class="font-sans text-xs text-red-600">{$updateErrors.room_id}</p>
					{/if}
				</div>

				<div class="flex flex-col gap-1">
					<label for="booking_source" class="font-sans text-sm font-medium text-gray-700">Nguồn đặt phòng</label>
					<select
						id="booking_source"
						name="booking_source"
						bind:value={$updateFormData.booking_source}
						disabled={$updateSubmitting}
						class="h-12 rounded-lg border border-gray-300 px-3 font-sans text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:bg-gray-50"
					>
						{#each sourceOptions as opt (opt.value)}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
					{#if $updateErrors.booking_source}
						<p class="font-sans text-xs text-red-600">{$updateErrors.booking_source}</p>
					{/if}
				</div>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<div class="flex flex-col gap-1">
					<label for="check_in_date" class="font-sans text-sm font-medium text-gray-700">Ngày check-in</label>
					<input
						id="check_in_date"
						name="check_in_date"
						type="date"
						bind:value={$updateFormData.check_in_date}
						disabled={$updateSubmitting}
						class="h-12 rounded-lg border border-gray-300 px-3 font-sans text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:bg-gray-50"
					/>
					{#if $updateErrors.check_in_date}
						<p class="font-sans text-xs text-red-600">{$updateErrors.check_in_date}</p>
					{/if}
				</div>

				{#if !$updateFormData.is_long_stay}
					<div class="flex flex-col gap-1">
						<label for="check_out_date" class="font-sans text-sm font-medium text-gray-700">Ngày check-out</label>
						<input
							id="check_out_date"
							name="check_out_date"
							type="date"
							bind:value={$updateFormData.check_out_date}
							disabled={$updateSubmitting}
							class="h-12 rounded-lg border border-gray-300 px-3 font-sans text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:bg-gray-50"
						/>
						{#if $updateErrors.check_out_date}
							<p class="font-sans text-xs text-red-600">{$updateErrors.check_out_date}</p>
						{/if}
					</div>
				{:else}
					<div class="flex flex-col gap-1">
						<label for="duration_days" class="font-sans text-sm font-medium text-gray-700">Thời gian lưu trú (ngày)</label>
						<input
							id="duration_days"
							name="duration_days"
							type="number"
							min="30"
							bind:value={$updateFormData.duration_days}
							disabled={$updateSubmitting}
							class="h-12 rounded-lg border border-gray-300 px-3 font-sans text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:bg-gray-50"
						/>
						{#if $updateErrors.duration_days}
							<p class="font-sans text-xs text-red-600">{$updateErrors.duration_days}</p>
						{/if}
					</div>
				{/if}
			</div>

			{#if isApartment}
				<div class="flex items-center gap-3">
					<input
						id="is_long_stay"
						name="is_long_stay"
						type="checkbox"
						bind:checked={$updateFormData.is_long_stay}
						disabled={$updateSubmitting}
						class="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary/40"
					/>
					<label for="is_long_stay" class="font-sans text-sm text-gray-700">Lưu trú dài hạn (30+ ngày)</label>
				</div>
			{/if}

			<div class="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row">
				<button
					type="submit"
					disabled={$updateSubmitting || data.booking.status === 'cancelled' || data.booking.status === 'checked_out'}
					class="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-sans text-sm font-semibold text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{#if $updateSubmitting}
						<span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
						Đang lưu...
					{:else}
						Lưu thay đổi
					{/if}
				</button>
				<button
					type="button"
					onclick={openCancelDialog}
					disabled={$updateSubmitting || data.booking.status === 'cancelled' || data.booking.status === 'checked_out'}
					class="min-h-[48px] rounded-lg border border-red-300 px-4 py-2.5 font-sans text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400/40 disabled:cursor-not-allowed disabled:opacity-60"
				>
					Hủy đặt phòng
				</button>
			</div>
		</div>
	</form>

	{#if showCancelDialog}
		<button
			type="button"
			class="fixed inset-0 z-40 bg-black/50"
			onclick={() => !$cancelSubmitting && (showCancelDialog = false)}
			aria-label="Đóng hộp thoại"
		></button>
		<div class="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="cancel-booking-title">
			<h2 id="cancel-booking-title" class="font-sans text-lg font-bold text-gray-900">Hủy đặt phòng</h2>

			{#if $cancelMessage}
				<div class="mt-3 rounded-lg px-3 py-2 font-sans text-sm {$cancelMessage.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}" role="alert">
					{$cancelMessage.text}
				</div>
			{/if}

			<form method="POST" action="?/cancel" use:enhanceCancel class="mt-4 flex flex-col gap-4">
				<input type="hidden" name="booking_id" value={$cancelFormData.booking_id} />
				<input type="hidden" name="room_id" value={$cancelFormData.room_id} />
				<input type="hidden" name="guest_name" value={$cancelFormData.guest_name} />

				{#if cancelStep === 1}
					<div class="rounded-lg bg-gray-50 px-4 py-3">
						<p class="font-sans text-sm text-gray-800">
							Bạn sắp hủy đặt phòng của <span class="font-semibold">{data.booking.guest.full_name}</span> (phòng {data.booking.room.room_number}).
						</p>
					</div>
					<div class="flex gap-3">
						<button type="button" class="min-h-[48px] flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-sans text-sm font-medium text-gray-700" onclick={() => (showCancelDialog = false)}>
							Đóng
						</button>
						<button type="button" class="min-h-[48px] flex-1 rounded-lg bg-red-600 px-4 py-2.5 font-sans text-sm font-semibold text-white" onclick={() => (cancelStep = 2)}>
							Tiếp tục hủy
						</button>
					</div>
				{:else}
					<div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
						<p class="font-sans text-sm font-medium text-red-800">Hủy đặt phòng của {data.booking.guest.full_name}?</p>
						<p class="mt-1 font-sans text-xs text-red-600">Hành động này sẽ chuyển trạng thái đặt phòng sang "Đã hủy".</p>
					</div>
					<div class="flex gap-3">
						<button
							type="button"
							disabled={$cancelSubmitting}
							onclick={() => (cancelStep = 1)}
							class="min-h-[48px] flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-sans text-sm font-medium text-gray-700 disabled:opacity-60"
						>
							Quay lại
						</button>
						<button
							type="submit"
							disabled={$cancelSubmitting}
							class="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 font-sans text-sm font-semibold text-white disabled:opacity-60"
						>
							{#if $cancelSubmitting}
								<span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
								Đang xử lý...
							{:else}
								Có, hủy đặt phòng
							{/if}
						</button>
					</div>
				{/if}
			</form>
		</div>
	{/if}
</div>
