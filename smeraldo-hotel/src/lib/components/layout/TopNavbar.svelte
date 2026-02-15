<script lang="ts">
	import { page } from '$app/stores';
	import LiveStatusIndicator from '$lib/components/layout/LiveStatusIndicator.svelte';

	type StaffRole = 'manager' | 'reception' | 'housekeeping';

	interface NavItem {
		href: string;
		label: string;
	}

	interface Props {
		role: StaffRole;
		fullName: string;
	}

	let { role, fullName }: Props = $props();

	const navMap: Record<StaffRole, NavItem[]> = {
		reception: [
			{ href: '/rooms', label: 'Phòng' },
			{ href: '/bookings', label: 'Đặt phòng' },
			{ href: '/attendance', label: 'Chấm công' },
			{ href: '/inventory', label: 'Kho' }
		],
		manager: [
			{ href: '/dashboard', label: 'Dashboard' },
			{ href: '/staff', label: 'Nhân viên' },
			{ href: '/reports', label: 'Báo cáo' }
		],
		housekeeping: [{ href: '/my-rooms', label: 'Phòng của tôi' }]
	};

	let navItems = $derived(navMap[role]);
</script>

<nav class="fixed inset-x-0 top-0 z-30 hidden h-12 border-b border-primary/20 bg-primary md:block">
	<div class="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
		<!-- Brand -->
		<!-- eslint-disable svelte/no-navigation-without-resolve -->
		<a href="/" class="font-sans text-sm font-bold text-white">Smeraldo Hotel</a>

		<!-- Nav links -->
		<div class="flex items-center gap-1">
			{#each navItems as item (item.href)}
				<a
					href={item.href}
					class="px-3 py-1.5 font-sans text-sm font-medium transition-colors motion-reduce:transition-none {$page.url.pathname.startsWith(
						item.href
					)
						? 'border-b-2 border-accent text-white'
						: 'text-white/70 hover:text-white'}"
				>
					{item.label}
				</a>
			{/each}
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		</div>

		<!-- User info + logout -->
		<div class="flex items-center gap-3">
			<LiveStatusIndicator />
			<span class="font-sans text-xs text-white/70">{fullName}</span>
			<form method="POST" action="/auth/logout">
				<button
					type="submit"
					class="rounded-md px-3 py-1.5 font-sans text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50"
				>
					Đăng xuất
				</button>
			</form>
		</div>
	</div>
</nav>
