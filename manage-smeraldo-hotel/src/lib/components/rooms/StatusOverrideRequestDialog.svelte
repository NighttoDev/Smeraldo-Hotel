<script lang="ts">
/**
 * Status Override Request Dialog
 *
 * Allows reception to submit room status override requests to managers.
 * Shows only valid status transitions based on current room status.
 */

import { superForm } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { getValidTransitions, ROOM_STATUS_LABELS } from '$lib/utils/room-status-transitions';
import { RoomStatusSchema } from '$lib/db/schema';
import type { RoomStatus } from '$lib/stores/roomState';
import { z } from 'zod';

interface Props {
  open: boolean;
  roomId: string;
  roomNumber: string;
  currentStatus: RoomStatus;
  onClose: () => void;
}

let { open = $bindable(false), roomId, roomNumber, currentStatus, onClose }: Props = $props();

// Zod schema for request form - use existing RoomStatusSchema
const requestSchema = z.object({
  room_id: z.string().uuid(),
  requested_status: RoomStatusSchema,
  reason: z.string().min(10, 'Lý do phải có ít nhất 10 ký tự')
});

// Get valid status options based on current room status
const validStatuses = $derived(getValidTransitions(currentStatus));
const statusOptions = $derived(
  validStatuses.map(status => ({
    value: status,
    label: ROOM_STATUS_LABELS[status]
  }))
);

// Initialize form
const { form, errors, enhance, submitting } = superForm(
  {
    room_id: roomId,
    requested_status: validStatuses[0] || ('being_cleaned' as RoomStatus),
    reason: ''
  },
  {
    validators: zod4(requestSchema),
    resetForm: true,
    onResult: ({ result }) => {
      if (result.type === 'success') {
        onClose();
      }
    }
  }
);

// Update form when roomId changes
$effect(() => {
  $form.room_id = roomId;
  if (validStatuses[0]) {
    $form.requested_status = validStatuses[0];
  }
});

function handleClose() {
  if (!$submitting) {
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
            Yêu cầu thay đổi trạng thái phòng
          </h2>
          <button
            type="button"
            onclick={handleClose}
            disabled={$submitting}
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
      <form method="POST" action="?/requestOverride" use:enhance>
        <div class="px-6 py-4 space-y-4">
          <!-- Room Info -->
          <div class="bg-gray-50 rounded-lg p-3">
            <div class="text-sm text-gray-600">Phòng</div>
            <div class="text-lg font-semibold text-gray-900">{roomNumber}</div>
            <div class="text-sm text-gray-600 mt-1">
              Trạng thái hiện tại: <span class="font-medium">{ROOM_STATUS_LABELS[currentStatus]}</span>
            </div>
          </div>

          <!-- Hidden room_id -->
          <input type="hidden" name="room_id" value={$form.room_id} />

          <!-- Status Selection -->
          <div>
            <label for="requested_status" class="block text-sm font-medium text-gray-700 mb-1">
              Trạng thái mới <span class="text-red-500">*</span>
            </label>
            <select
              id="requested_status"
              name="requested_status"
              bind:value={$form.requested_status}
              disabled={$submitting}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {#each statusOptions as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
            {#if $errors.requested_status}
              <p class="mt-1 text-sm text-red-600">{$errors.requested_status}</p>
            {/if}
          </div>

          <!-- Reason -->
          <div>
            <label for="reason" class="block text-sm font-medium text-gray-700 mb-1">
              Lý do <span class="text-red-500">*</span>
            </label>
            <textarea
              id="reason"
              name="reason"
              bind:value={$form.reason}
              disabled={$submitting}
              rows="4"
              placeholder="Nhập lý do thay đổi trạng thái (tối thiểu 10 ký tự)..."
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
            ></textarea>
            {#if $errors.reason}
              <p class="mt-1 text-sm text-red-600">{$errors.reason}</p>
            {/if}
            <p class="mt-1 text-xs text-gray-500">
              {$form.reason.length}/10 ký tự tối thiểu
            </p>
          </div>

          <!-- Info Message -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div class="flex">
              <svg class="w-5 h-5 text-blue-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
              </svg>
              <p class="text-sm text-blue-700">
                Yêu cầu sẽ được gửi đến quản lý để phê duyệt. Bạn sẽ nhận được thông báo khi yêu cầu được xử lý.
              </p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onclick={handleClose}
            disabled={$submitting}
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={$submitting}
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {#if $submitting}
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Đang gửi...
            {:else}
              Gửi yêu cầu
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
