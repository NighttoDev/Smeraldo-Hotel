<script lang="ts">
	import TopNavbar from '$lib/components/layout/TopNavbar.svelte';
	import BottomTabBar from '$lib/components/layout/BottomTabBar.svelte';

	let { data, children } = $props();
</script>

<TopNavbar role={data.role} fullName={data.fullName} />
<BottomTabBar role={data.role} />

<main id="main-content" class="min-h-screen bg-background pb-16 pt-0 md:pb-0 md:pt-12">
	{@render children()}
</main>
