<script lang="ts">
  interface Props {
    floors: number[];
    selected: number | null;
    onselect: (floor: number | null) => void;
  }

  let { floors, selected, onselect }: Props = $props();
</script>

<div class="flex flex-wrap gap-2" role="group" aria-label="Lọc theo tầng">
  <button
    type="button"
    onclick={() => onselect(null)}
    class="min-h-[48px] rounded-full px-4 py-1.5 font-sans text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 {selected === null ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
  >
    Tất cả
  </button>
  {#each floors as floor (floor)}
    <button
      type="button"
      onclick={() => onselect(floor)}
      class="min-h-[48px] rounded-full px-4 py-1.5 font-sans text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 {selected === floor ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
    >
      T{floor}
    </button>
  {/each}
</div>
