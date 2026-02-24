<script lang="ts">
/**
 * End Shift Dialog
 *
 * Confirmation dialog for ending a shift. Shows shift duration and optional notes.
 */

import { enhance } from '$app/forms';
import type { SubmitFunction } from '@sveltejs/kit';

interface Props {
	open: boolean;
	shiftStartedAt: string | null;
	staffName: string;
	onClose: () => void;
}

let { open = $bindable(false), shiftStartedAt, staffName, onClose }: Props = $props();

let submitting = $state(false);
let notes = $state('');

// Calculate shift duration
const shiftDuration = $derived.by(() => {
	if (!shiftStartedAt) return null;

	const start = new Date(shiftStartedAt);
	const now = new Date();
	const durationMs = now.getTime() - start.getTime();

	const hours = Math.floor(durationMs / (60 * 60 * 1000));
	const minutes = Math.floor((durationMs % (60 * 60 * 1000)) / (60 * 1000));

	return {
		hours,
		minutes,
		formatted: `${hours} giờ ${minutes} phút`,
		startTime: start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
	};
});

const handleSubmit: SubmitFunction = () => {
	submitting = true;

	return async ({ result, update }) => {
		await update();
		submitting = false;

		if (result.type === 'success') {
			notes = '';
			onClose();
		}
	};
};

function handleClose() {
	if (!submitting) {
		notes = '';
		onClose();
	}
}
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
		<div class="bg-white rounded-lg shadow-xl max-w-md w-full">
			<!-- Header -->
			<div class="px-6 py-4 border-b border-gray-200">
				<div class="flex items-center justify-between">
					<h2 class="text-lg font-semibold text-gray-900">
						Kết thúc ca làm việc
					</h2>
					<button
						type="button"
						onclick={handleClose}
						disabled={submitting}
						aria-label="Đóng hộp thoại"
						class="text-gray-400 hover:text-gray-600 disabled:opacity-50"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
						</svg>
					</button>
				</div>
			</div>

			<!-- Form -->
			<form method="POST" action="?/endShift" use:enhance={handleSubmit}>
				<div class="px-6 py-4 space-y-4">
					<!-- Staff Info -->
					<div class="bg-gray-50 rounded-lg p-3">
						<div class="text-sm text-gray-600">Nhân viên</div>
						<div class="text-lg font-semibold text-gray-900">{staffName}</div>
						{#if shiftDuration}
							<div class="text-sm text-gray-600 mt-2">
								<div>Bắt đầu: <span class="font-medium">{shiftDuration.startTime}</span></div>
								<div>Thời gian làm việc: <span class="font-medium">{shiftDuration.formatted}</span></div>
							</div>
						{/if}
					</div>

					<!-- Notes (Optional) -->
					<div>
						<label for="shift_notes" class="block text-sm font-medium text-gray-700 mb-1">
							Ghi chú (tùy chọn)
						</label>
						<textarea
							id="shift_notes"
							name="notes"
							bind:value={notes}
							disabled={submitting}
							rows="3"
							placeholder="Nhập ghi chú về ca làm việc nếu cần..."
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
						></textarea>
					</div>

					<!-- Warning if shift > 12h -->
					{#if shiftDuration && shiftDuration.hours >= 12}
						<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
							<div class="flex">
								<svg class="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
									<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
								</svg>
								<p class="text-sm text-yellow-700">
									Ca làm việc đã vượt quá 12 giờ. Đảm bảo nghỉ ngơi đầy đủ.
								</p>
							</div>
						</div>
					{/if}

					<!-- Confirmation Message -->
					<div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
						<div class="flex">
							<svg class="w-5 h-5 text-blue-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
							</svg>
							<p class="text-sm text-blue-700">
								Xác nhận kết thúc ca làm việc sẽ cập nhật thời gian và lưu vào hệ thống.
							</p>
						</div>
					</div>
				</div>

				<!-- Footer -->
				<div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
					<button
						type="button"
						onclick={handleClose}
						disabled={submitting}
						class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Hủy
					</button>
					<button
						type="submit"
						disabled={submitting}
						class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
					>
						{#if submitting}
							<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							Đang kết thúc...
						{:else}
							Kết thúc ca
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
