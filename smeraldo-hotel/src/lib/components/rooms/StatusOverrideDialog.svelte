<script lang="ts">
  type RoomStatus = 'available' | 'occupied' | 'checking_out_today' | 'being_cleaned' | 'ready';

  interface RoomState {
    id: string;
    room_number: string;
    floor: number;
    room_type: string;
    status: RoomStatus;
    current_guest_name: string | null;
  }

  interface Props {
    room: RoomState | null;
    onconfirm: (roomId: string, newStatus: RoomStatus) => void;
    oncancel: () => void;
  }

  let { room, onconfirm, oncancel }: Props = $props();

  const allStatuses: { value: RoomStatus; label: string }[] = [
    { value: 'available', label: 'Trống' },
    { value: 'occupied', label: 'Có khách' },
    { value: 'checking_out_today', label: 'Trả phòng' },
    { value: 'being_cleaned', label: 'Đang dọn' },
    { value: 'ready', label: 'Sẵn sàng' }
  ];

  let selectedStatus = $state<RoomStatus | ''>('');

  $effect(() => {
    if (room) {
      selectedStatus = '';
    }
  });

  function handleConfirm() {
    if (room && selectedStatus && selectedStatus !== room.status) {
      onconfirm(room.id, selectedStatus);
    }
  }
</script>

{#if room}
  <!-- Backdrop -->
  <button
    type="button"
    class="fixed inset-0 z-40 cursor-default bg-black/50"
    onclick={oncancel}
    aria-label="Đóng hộp thoại"
    tabindex="-1"
  ></button>

  <!-- Dialog -->
  <div
    class="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl sm:inset-x-auto"
    role="dialog"
    aria-modal="true"
    aria-labelledby="override-title"
  >
    <h3 id="override-title" class="font-sans text-lg font-bold text-high-contrast">
      Đổi trạng thái phòng {room.room_number}
    </h3>
    <p class="mt-1 font-sans text-sm text-gray-500">
      Trạng thái hiện tại: <span class="font-medium">{allStatuses.find((s) => s.value === room.status)?.label}</span>
    </p>

    <div class="mt-4 space-y-2">
      {#each allStatuses.filter((s) => s.value !== room.status) as option (option.value)}
        <label
          class="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors {selectedStatus === option.value ? 'border-primary bg-primary/5' : 'border-gray-200 hover:bg-gray-50'}"
        >
          <input
            type="radio"
            name="status"
            value={option.value}
            bind:group={selectedStatus}
            class="h-4 w-4 text-primary focus:ring-primary"
          />
          <span class="font-sans text-sm font-medium text-high-contrast">{option.label}</span>
        </label>
      {/each}
    </div>

    <div class="mt-6 flex justify-end gap-3">
      <button
        type="button"
        onclick={oncancel}
        class="rounded-md px-4 py-2 font-sans text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        Hủy
      </button>
      <button
        type="button"
        onclick={handleConfirm}
        disabled={!selectedStatus || selectedStatus === room.status}
        class="rounded-md bg-primary px-4 py-2 font-sans text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Xác nhận đổi
      </button>
    </div>
  </div>
{/if}
