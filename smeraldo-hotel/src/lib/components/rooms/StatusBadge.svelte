<script lang="ts">
  type RoomStatus = 'available' | 'occupied' | 'checking_out_today' | 'being_cleaned' | 'ready';

  interface Props {
    status: RoomStatus;
    size?: 'sm' | 'md';
  }

  let { status, size = 'sm' }: Props = $props();

  const statusConfig: Record<RoomStatus, { label: string; classes: string }> = {
    available: { label: 'Trống', classes: 'bg-room-available/10 text-room-available' },
    occupied: { label: 'Có khách', classes: 'bg-room-occupied/10 text-room-occupied' },
    checking_out_today: { label: 'Trả phòng', classes: 'bg-room-checkout/10 text-room-checkout' },
    being_cleaned: { label: 'Đang dọn', classes: 'bg-room-cleaning/10 text-room-cleaning' },
    ready: { label: 'Sẵn sàng', classes: 'bg-room-ready/10 text-room-ready' }
  };

  let config = $derived(statusConfig[status]);
  let sizeClasses = $derived(size === 'md' ? 'text-sm px-2.5 py-1' : 'text-xs px-2 py-0.5');
</script>

<span
  class="inline-flex items-center rounded-full font-sans font-medium {config.classes} {sizeClasses}"
  role="status"
>
  <span class="mr-1.5 h-1.5 w-1.5 rounded-full bg-current"></span>
  {config.label}
</span>
