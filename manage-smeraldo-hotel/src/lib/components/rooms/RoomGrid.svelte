<script lang="ts">
  import RoomTile from './RoomTile.svelte';

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
    rooms: RoomState[];
    isOffline?: boolean;
    onroomclick?: (roomId: string) => void;
  }

  let { rooms, isOffline = false, onroomclick }: Props = $props();

  let roomsByFloor = $derived(
    rooms.reduce(
      (groups: Record<number, RoomState[]>, room) => {
        if (!groups[room.floor]) groups[room.floor] = [];
        groups[room.floor].push(room);
        return groups;
      },
      {} as Record<number, RoomState[]>
    )
  );

  let sortedFloors = $derived(
    Object.keys(roomsByFloor).map(Number).sort((a, b) => a - b)
  );
</script>

<div class="space-y-6">
  {#if isOffline}
    <div class="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-sans text-sm text-gray-700">
      Ngoại tuyến — đang hiển thị dữ liệu đã đồng bộ gần nhất
    </div>
  {/if}

  <div class="relative" data-offline={isOffline ? 'true' : 'false'}>
    {#if isOffline}
      <div class="pointer-events-none absolute inset-0 z-10 rounded-xl bg-white/50" aria-hidden="true"></div>
      <div class="pointer-events-none absolute left-3 top-3 z-20 rounded-full border border-gray-300 bg-white/90 px-3 py-1 font-sans text-xs font-medium text-gray-700">
        Ngoại tuyến
      </div>
    {/if}

  {#each sortedFloors as floor (floor)}
    <section>
      <h2 class="mb-3 font-sans text-sm font-semibold uppercase tracking-wide text-gray-500">
        Tầng {floor}
      </h2>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {#each roomsByFloor[floor] ?? [] as room (room.id)}
          <RoomTile {room} onclick={() => onroomclick?.(room.id)} />
        {/each}
      </div>
    </section>
  {/each}

  {#if rooms.length === 0}
    <div class="py-12 text-center font-sans text-sm text-gray-500">
      Không có phòng nào.
    </div>
  {/if}
  </div>
</div>
