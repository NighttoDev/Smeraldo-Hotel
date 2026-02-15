<script lang="ts">
  interface StatusCounts {
    available: number;
    occupied: number;
    checking_out_today: number;
    being_cleaned: number;
    ready: number;
  }

  interface Props {
    counts: StatusCounts;
  }

  let { counts }: Props = $props();

  const items = $derived([
    { label: 'Có khách', count: counts.occupied, dotClass: 'bg-room-occupied' },
    { label: 'Trống', count: counts.available, dotClass: 'bg-room-available' },
    { label: 'Trả phòng', count: counts.checking_out_today, dotClass: 'bg-room-checkout' },
    { label: 'Đang dọn', count: counts.being_cleaned, dotClass: 'bg-room-cleaning' },
    { label: 'Sẵn sàng', count: counts.ready, dotClass: 'bg-room-ready' }
  ]);
</script>

<div class="flex flex-wrap items-center gap-x-4 gap-y-1 font-sans text-sm text-gray-600">
  {#each items as item (item.label)}
    <span class="inline-flex items-center gap-1.5">
      <span class="h-2 w-2 rounded-full {item.dotClass}"></span>
      <span class="font-medium">{item.count}</span>
      <span class="text-gray-400">{item.label}</span>
    </span>
  {/each}
</div>
