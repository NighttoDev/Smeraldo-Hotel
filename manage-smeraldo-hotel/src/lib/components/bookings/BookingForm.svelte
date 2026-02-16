<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod4 } from 'sveltekit-superforms/adapters';
	import { CreateBookingFormSchema } from '$lib/db/schema';
	import GuestInput from '$lib/components/bookings/GuestInput.svelte';
	import type { SuperValidated } from 'sveltekit-superforms';
	import type { CreateBookingForm } from '$lib/db/schema';

	interface RoomOption {
		id: string;
		room_number: string;
		floor: number;
		room_type: string;
	}

	interface Props {
		rooms: RoomOption[];
		form: SuperValidated<CreateBookingForm>;
	}

	let { rooms, form: initialForm }: Props = $props();

	const { form: formData, errors, enhance, submitting, message } = superForm(initialForm, {
		validators: zod4(CreateBookingFormSchema),
		validationMethod: 'onblur'
	});

	const sourceOptions = [
		{ value: 'agoda', label: 'Agoda' },
		{ value: 'booking_com', label: 'Booking.com' },
		{ value: 'trip_com', label: 'Trip.com' },
		{ value: 'facebook', label: 'Facebook' },
		{ value: 'walk_in', label: 'Khách vãng lai' }
	];

	// Detect OTA sources (pre-populated guest name)
	let isOtaSource = $derived(
		['agoda', 'booking_com', 'trip_com'].includes($formData.booking_source ?? '')
	);

	// Detect apartment room (enables long-stay)
	let selectedRoom = $derived(rooms.find((r) => r.id === $formData.room_id));
	let isApartment = $derived(
		selectedRoom ? selectedRoom.room_type.toLowerCase().includes('apartment') : false
	);

	// Reset long-stay when non-apartment room selected
	function onRoomChange() {
		if (!isApartment) {
			$formData.is_long_stay = false;
		}
	}
</script>

<form method="POST" action="?/submit" use:enhance class="flex flex-col gap-5">
	<!-- Server-level message -->
	{#if $message}
		<div
			class="rounded-lg px-4 py-3 font-sans text-sm {$message.type === 'error'
				? 'bg-red-50 text-red-700'
				: 'bg-green-50 text-green-700'}"
			role="alert"
		>
			{$message.text}
		</div>
	{/if}

	<!-- Guest name -->
	<GuestInput
		bind:value={$formData.guest_name}
		error={$errors.guest_name}
		placeholder={isOtaSource ? 'Tên đã lấy từ OTA — kiểm tra lại' : 'Nhập tên khách'}
	/>

	<!-- Room selector -->
	<div class="flex flex-col gap-1">
		<label for="room_id" class="font-sans text-sm font-medium text-gray-700">
			Phòng <span class="text-red-500" aria-hidden="true">*</span>
		</label>
		<select
			id="room_id"
			name="room_id"
			bind:value={$formData.room_id}
			onchange={onRoomChange}
			aria-required="true"
			aria-invalid={!!$errors.room_id}
			class="h-12 rounded-lg border px-3 font-sans text-sm text-gray-900 focus:outline-none focus:ring-2 motion-reduce:transition-none
			{$errors.room_id
				? 'border-red-400 focus:ring-red-300'
				: 'border-gray-300 focus:ring-primary/40'}"
		>
			<option value="" disabled>Chọn phòng...</option>
			{#each rooms as room (room.id)}
				<option value={room.id}>
					F{room.floor} — {room.room_number} ({room.room_type})
				</option>
			{/each}
		</select>
		{#if $errors.room_id}
			<p class="font-sans text-xs text-red-600" role="alert">{$errors.room_id}</p>
		{/if}
	</div>

	<!-- Booking source -->
	<div class="flex flex-col gap-1">
		<label for="booking_source" class="font-sans text-sm font-medium text-gray-700">
			Nguồn đặt phòng <span class="text-red-500" aria-hidden="true">*</span>
		</label>
		<select
			id="booking_source"
			name="booking_source"
			bind:value={$formData.booking_source}
			aria-required="true"
			aria-invalid={!!$errors.booking_source}
			class="h-12 rounded-lg border px-3 font-sans text-sm text-gray-900 focus:outline-none focus:ring-2 motion-reduce:transition-none
			{$errors.booking_source
				? 'border-red-400 focus:ring-red-300'
				: 'border-gray-300 focus:ring-primary/40'}"
		>
			<option value="" disabled>Chọn nguồn...</option>
			{#each sourceOptions as opt (opt.value)}
				<option value={opt.value}>{opt.label}</option>
			{/each}
		</select>
		{#if $errors.booking_source}
			<p class="font-sans text-xs text-red-600" role="alert">{$errors.booking_source}</p>
		{/if}
	</div>

	<!-- Date fields — two-column on desktop -->
	<div class="grid gap-4 sm:grid-cols-2">
		<!-- Check-in date -->
		<div class="flex flex-col gap-1">
			<label for="check_in_date" class="font-sans text-sm font-medium text-gray-700">
				Ngày check-in <span class="text-red-500" aria-hidden="true">*</span>
			</label>
			<input
				id="check_in_date"
				name="check_in_date"
				type="date"
				bind:value={$formData.check_in_date}
				aria-required="true"
				aria-invalid={!!$errors.check_in_date}
				class="h-12 rounded-lg border px-3 font-sans text-sm text-gray-900 focus:outline-none focus:ring-2 motion-reduce:transition-none
				{$errors.check_in_date
					? 'border-red-400 focus:ring-red-300'
					: 'border-gray-300 focus:ring-primary/40'}"
			/>
			{#if $errors.check_in_date}
				<p class="font-sans text-xs text-red-600" role="alert">{$errors.check_in_date}</p>
			{/if}
		</div>

		<!-- Check-out date or duration_days -->
		{#if !$formData.is_long_stay}
			<div class="flex flex-col gap-1">
				<label for="check_out_date" class="font-sans text-sm font-medium text-gray-700">
					Ngày check-out <span class="text-red-500" aria-hidden="true">*</span>
				</label>
				<input
					id="check_out_date"
					name="check_out_date"
					type="date"
					bind:value={$formData.check_out_date}
					aria-required="true"
					aria-invalid={!!$errors.check_out_date}
					class="h-12 rounded-lg border px-3 font-sans text-sm text-gray-900 focus:outline-none focus:ring-2 motion-reduce:transition-none
					{$errors.check_out_date
						? 'border-red-400 focus:ring-red-300'
						: 'border-gray-300 focus:ring-primary/40'}"
				/>
				{#if $errors.check_out_date}
					<p class="font-sans text-xs text-red-600" role="alert">{$errors.check_out_date}</p>
				{/if}
			</div>
		{:else}
			<div class="flex flex-col gap-1">
				<label for="duration_days" class="font-sans text-sm font-medium text-gray-700">
					Thời gian lưu trú (ngày) <span class="text-red-500" aria-hidden="true">*</span>
				</label>
				<input
					id="duration_days"
					name="duration_days"
					type="number"
					min="30"
					bind:value={$formData.duration_days}
					placeholder="≥ 30 ngày"
					aria-required="true"
					aria-invalid={!!$errors.duration_days}
					class="h-12 rounded-lg border px-3 font-sans text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 motion-reduce:transition-none
					{$errors.duration_days
						? 'border-red-400 focus:ring-red-300'
						: 'border-gray-300 focus:ring-primary/40'}"
				/>
				{#if $errors.duration_days}
					<p class="font-sans text-xs text-red-600" role="alert">{$errors.duration_days}</p>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Long-stay toggle — only shown for apartment rooms -->
	{#if isApartment}
		<div class="flex items-center gap-3">
			<input
				id="is_long_stay"
				name="is_long_stay"
				type="checkbox"
				bind:checked={$formData.is_long_stay}
				class="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary/40"
			/>
			<label for="is_long_stay" class="font-sans text-sm text-gray-700">
				Lưu trú dài hạn (30+ ngày)
			</label>
		</div>
	{/if}

	<!-- Submit -->
	<div class="pt-2">
		<button
			type="submit"
			disabled={$submitting}
			class="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary font-sans text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
		>
			{#if $submitting}
				<span
					class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent motion-reduce:animate-none"
					aria-hidden="true"
				></span>
				Đang lưu...
			{:else}
				Tạo đặt phòng
			{/if}
		</button>
	</div>
</form>
