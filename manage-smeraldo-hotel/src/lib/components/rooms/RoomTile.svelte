<script lang="ts">
  import StatusBadge from './StatusBadge.svelte';
  import type { RoomState, RoomStatus } from '$lib/stores/roomState';

  interface Props {
    room: RoomState;
    onclick?: () => void;
  }

  let { room, onclick }: Props = $props();

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
    <StatusBadge status={room.status} />
  </div>
  <span class="mt-1 font-sans text-xs text-gray-500">{room.room_type}</span>
  {#if room.status === 'occupied'}
    <span
      class="mt-auto max-w-[20ch] truncate pt-2 font-sans text-sm font-medium text-body-text"
      title={room.current_guest_name ?? '—'}
    >
      {room.current_guest_name ?? '—'}
    </span>
  {/if}
</button>
