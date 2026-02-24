<script lang="ts">
/**
 * Shift Status Indicator
 *
 * Displays current shift status with remaining time countdown.
 * Updates every minute to show accurate time remaining until 12h mark.
 */

import { onMount, onDestroy } from 'svelte';
import { getRemainingTime, isShiftExpired } from '$lib/utils/shift-timer';

interface Props {
	/** Shift start timestamp (ISO string) */
	shiftStartedAt: string | null;
	/** Staff member name */
	staffName: string;
	/** Optional callback when shift expires */
	onShiftExpired?: () => void;
}

let { shiftStartedAt, staffName, onShiftExpired }: Props = $props();

// Reactive state for remaining time
let remainingTime = $state<{ hours: number; minutes: number; formatted: string } | null>(null);
let expired = $state(false);
let intervalId: ReturnType<typeof setInterval> | null = null;

function updateRemainingTime() {
	if (!shiftStartedAt) {
		remainingTime = null;
		expired = false;
		return;
	}

	// Check if shift expired
	if (isShiftExpired(shiftStartedAt)) {
		expired = true;
		remainingTime = { hours: 0, minutes: 0, formatted: '0h 0m' };

		// Clear interval when expired
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = null;
		}

		// Trigger callback
		if (onShiftExpired) {
			onShiftExpired();
		}
		return;
	}

	// Update remaining time
	const remaining = getRemainingTime(shiftStartedAt);
	remainingTime = remaining;
	expired = false;
}

onMount(() => {
	// Update immediately
	updateRemainingTime();

	// Update every minute
	if (shiftStartedAt) {
		intervalId = setInterval(updateRemainingTime, 60 * 1000);
	}
});

onDestroy(() => {
	if (intervalId) {
		clearInterval(intervalId);
	}
});

// Watch for shift changes
$effect(() => {
	updateRemainingTime();

	// Restart interval if shift started
	if (shiftStartedAt && !intervalId) {
		intervalId = setInterval(updateRemainingTime, 60 * 1000);
	}

	// Clear interval if shift ended
	if (!shiftStartedAt && intervalId) {
		clearInterval(intervalId);
		intervalId = null;
	}
});
</script>

{#if shiftStartedAt && remainingTime}
	<div class="flex items-center gap-3 px-4 py-3 rounded-lg border {expired ? 'bg-red-50 border-red-300' : 'bg-blue-50 border-blue-300'}">
		<!-- Status Icon -->
		<div class="flex-shrink-0">
			{#if expired}
				<svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
				</svg>
			{:else}
				<svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
				</svg>
			{/if}
		</div>

		<!-- Status Text -->
		<div class="flex-1 min-w-0">
			<div class="text-sm font-medium {expired ? 'text-red-900' : 'text-blue-900'}">
				{staffName}
			</div>
			{#if expired}
				<div class="text-xs text-red-700 font-semibold">
					Ca làm việc đã quá 12 giờ - Vui lòng kết thúc ca
				</div>
			{:else}
				<div class="text-xs text-blue-700">
					Thời gian còn lại: <span class="font-semibold">{remainingTime.formatted}</span>
				</div>
			{/if}
		</div>

		<!-- Warning Badge (only when expired) -->
		{#if expired}
			<div class="flex-shrink-0">
				<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
					Quá hạn
				</span>
			</div>
		{/if}
	</div>
{:else}
	<!-- No active shift -->
	<div class="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-300 bg-gray-50">
		<div class="flex-shrink-0">
			<svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
			</svg>
		</div>
		<div class="flex-1 min-w-0">
			<div class="text-sm font-medium text-gray-900">{staffName}</div>
			<div class="text-xs text-gray-600">Chưa bắt đầu ca làm việc</div>
		</div>
	</div>
{/if}
