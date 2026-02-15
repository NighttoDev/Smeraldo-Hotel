<script lang="ts">
	import '../app.css';
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';

	let { data, children } = $props();
	let { supabase, session } = $derived(data);

	onMount(() => {
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((_event, newSession) => {
			if (newSession?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
		});

		return () => subscription.unsubscribe();
	});
</script>

{@render children()}
