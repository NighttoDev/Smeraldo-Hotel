<script lang="ts">
  import StatusBadge from './StatusBadge.svelte';
  import type { RoomState, RoomStatus } from '$lib/stores/roomState';

  interface Props {
    room: RoomState;
    onclick?: () => void;
    hasPendingOverride?: boolean;
  }

  let { room, onclick, hasPendingOverride = false }: Props = $props();

  const borderColors: Record<RoomStatus, string> = {
    available: 'border-room-available',
    occupied: 'border-room-occupied',
    checking_out_today: 'border-room-checkout',
    being_cleaned: 'border-room-cleaning',
    ready: 'border-room-ready'
  };

  const bgColors: Record<RoomStatus, string> = {
    available: 'bg-room-available/10',
    occupied: 'bg-room-occupied/10',
    checking_out_today: 'bg-room-checkout/10',
    being_cleaned: 'bg-room-cleaning/10',
    ready: 'bg-room-ready/10'
  };

  const statusLabels: Record<RoomStatus, string> = {
    available: 'Trống',
    occupied: 'Có khách',
    checking_out_today: 'Trả phòng',
    being_cleaned: 'Đang dọn',
    ready: 'Sẵn sàng'
  };

  let borderClass = $derived(borderColors[room.status]);
  let bgClass = $derived(bgColors[room.status]);
  let statusLabel = $derived(statusLabels[room.status]);
</script>

<button
  type="button"
  onclick={onclick}
  class="flex min-h-[100px] w-full flex-col items-start rounded-lg border-l-4 p-3 text-left shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 motion-reduce:transition-none {borderClass} {bgClass}"
  aria-label="Phòng {room.room_number} — {statusLabel}"
>
  <div class="flex w-full items-center justify-between">
    <span class="font-mono text-lg font-bold text-high-contrast">{room.room_number}</span>
    <div class="flex items-center gap-1.5">
      {#if hasPendingOverride}
        <span class="flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded" title="Có yêu cầu thay đổi trạng thái đang chờ duyệt">
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"/>
          </svg>
          <span class="hidden sm:inline">Chờ duyệt</span>
        </span>
      {/if}
      <StatusBadge status={room.status} />
    </div>
  </div>
  <span class="mt-1 font-sans text-xs text-gray-500">{room.room_type}</span>
  {#if room.status === 'occupied'}
    <span
      class="mt-auto max-w-[20ch] truncate pt-2 font-sans text-base font-medium text-body-text"
      title={room.current_guest_name ?? '—'}
    >
      {room.current_guest_name ?? '—'}
    </span>
  {/if}
</button>
