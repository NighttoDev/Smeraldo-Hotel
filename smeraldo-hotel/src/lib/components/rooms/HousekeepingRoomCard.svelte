<script lang="ts">
  import StatusBadge from './StatusBadge.svelte';

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
    room: RoomState;
    onmarkready: (roomId: string) => void;
    loading?: boolean;
  }

  let { room, onmarkready, loading = false }: Props = $props();
</script>

<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
  <div class="flex items-center justify-between">
    <div>
      <span class="font-mono text-xl font-bold text-high-contrast">{room.room_number}</span>
      <span class="ml-2 font-sans text-sm text-gray-500">Tầng {room.floor}</span>
    </div>
    <StatusBadge status={room.status} size="md" />
  </div>

  <p class="mt-1 font-sans text-sm text-gray-500">{room.room_type}</p>

  {#if room.current_guest_name}
    <p class="mt-2 font-sans text-sm text-body-text">
      Khách: <span class="font-medium">{room.current_guest_name}</span>
    </p>
  {/if}

  <button
    type="button"
    onclick={() => onmarkready(room.id)}
    disabled={loading}
    class="mt-3 flex min-h-[48px] w-full items-center justify-center rounded-lg bg-room-ready px-4 py-3 font-sans text-sm font-semibold text-white shadow-sm hover:bg-room-ready/90 focus:outline-none focus:ring-2 focus:ring-room-ready/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {#if loading}
      <svg class="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Đang cập nhật...
    {:else}
      ✓ Đánh dấu sẵn sàng
    {/if}
  </button>
</div>
