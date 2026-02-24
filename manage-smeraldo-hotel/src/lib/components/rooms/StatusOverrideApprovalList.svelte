<script lang="ts">
/**
 * Status Override Approval List
 *
 * Displays pending room status override requests for manager review.
 * Allows managers to approve or reject requests with optional comments.
 */

import { pendingRequestsStore } from '$lib/stores/override-requests-store';
import { ROOM_STATUS_LABELS } from '$lib/utils/room-status-transitions';
import type { RoomStatus } from '$lib/stores/roomState';
import { enhance } from '$app/forms';

let rejectingRequestId = $state<string | null>(null);
let rejectComment = $state('');
let submittingRequestId = $state<string | null>(null);

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  return `${diffDays} ngày trước`;
}

function handleApprove(requestId: string) {
  submittingRequestId = requestId;
}

function handleRejectClick(requestId: string) {
  rejectingRequestId = requestId;
  rejectComment = '';
}

function handleRejectCancel() {
  rejectingRequestId = null;
  rejectComment = '';
}

function handleRejectSubmit(requestId: string) {
  submittingRequestId = requestId;
}
</script>

<div class="bg-white rounded-lg shadow-sm border border-gray-200">
  <!-- Header -->
  <div class="px-6 py-4 border-b border-gray-200">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold text-gray-900">
        Yêu cầu thay đổi trạng thái phòng
      </h3>
      {#if $pendingRequestsStore.length > 0}
        <span class="px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
          {$pendingRequestsStore.length}
        </span>
      {/if}
    </div>
  </div>

  <!-- Content -->
  <div class="divide-y divide-gray-200">
    {#if $pendingRequestsStore.length === 0}
      <!-- Empty State -->
      <div class="px-6 py-12 text-center">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">Không có yêu cầu</h3>
        <p class="mt-1 text-sm text-gray-500">Tất cả yêu cầu đã được xử lý</p>
      </div>
    {:else}
      <!-- Request Cards -->
      {#each $pendingRequestsStore as request (request.id)}
        <div class="px-6 py-4 hover:bg-gray-50 transition-colors">
          <div class="flex items-start justify-between gap-4">
            <!-- Request Info -->
            <div class="flex-1 min-w-0">
              <!-- Room and Status -->
              <div class="flex items-center gap-3 mb-2">
                <span class="text-lg font-semibold text-gray-900">
                  Phòng {request.room_number || request.room_id.slice(0, 8)}
                </span>
                <div class="flex items-center gap-2 text-sm">
                  <span class="px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-medium">
                    {ROOM_STATUS_LABELS[(request.current_status || 'available') as RoomStatus]}
                  </span>
                  <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                  <span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                    {ROOM_STATUS_LABELS[request.requested_status as RoomStatus]}
                  </span>
                </div>
              </div>

              <!-- Reason -->
              <div class="mb-2">
                <span class="text-sm font-medium text-gray-700">Lý do:</span>
                <p class="text-sm text-gray-600 mt-0.5">{request.reason}</p>
              </div>

              <!-- Metadata -->
              <div class="flex items-center gap-4 text-xs text-gray-500">
                <span>
                  Yêu cầu bởi: <span class="font-medium text-gray-700">{request.requester_name || 'N/A'}</span>
                </span>
                <span>•</span>
                <span>{formatTimeAgo(request.created_at)}</span>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-2 flex-shrink-0">
              <!-- Approve Button -->
              <form method="POST" action="?/approveOverride" use:enhance={() => {
                handleApprove(request.id);
                return async ({ update }) => {
                  await update();
                  submittingRequestId = null;
                };
              }}>
                <input type="hidden" name="request_id" value={request.id} />
                <button
                  type="submit"
                  disabled={submittingRequestId === request.id}
                  class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {#if submittingRequestId === request.id}
                    <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  {:else}
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                  {/if}
                  Duyệt
                </button>
              </form>

              <!-- Reject Button -->
              <button
                type="button"
                onclick={() => handleRejectClick(request.id)}
                disabled={submittingRequestId === request.id}
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
                Từ chối
              </button>
            </div>
          </div>

          <!-- Reject Comment Modal (inline) -->
          {#if rejectingRequestId === request.id}
            <div class="mt-4 pt-4 border-t border-gray-200">
              <form method="POST" action="?/rejectOverride" use:enhance={() => {
                handleRejectSubmit(request.id);
                return async ({ update }) => {
                  await update();
                  submittingRequestId = null;
                  rejectingRequestId = null;
                };
              }}>
                <input type="hidden" name="request_id" value={request.id} />
                <label for="manager_comment_{request.id}" class="block text-sm font-medium text-gray-700 mb-1">
                  Lý do từ chối (tùy chọn)
                </label>
                <textarea
                  id="manager_comment_{request.id}"
                  name="manager_comment"
                  bind:value={rejectComment}
                  rows="2"
                  placeholder="Nhập lý do từ chối..."
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none text-sm"
                ></textarea>
                <div class="flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onclick={handleRejectCancel}
                    class="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRequestId === request.id}
                    class="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {#if submittingRequestId === request.id}
                      <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Đang từ chối...
                    {:else}
                      Xác nhận từ chối
                    {/if}
                  </button>
                </div>
              </form>
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</div>
